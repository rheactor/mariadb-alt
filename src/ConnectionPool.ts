import { Connection, type ConnectionOptions } from "@/Connection";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatementResponse";

interface ConnectionPoolOptions {
  /**
   * Connections limit.
   * Default is 20.
   */
  connections: number;

  /**
   * Minimum of idle connections that never is released by idle timeout.
   * Default is half of `connections` options.
   */
  idleConnections: number;

  /**
   * Do something with the connection after it is initialized.
   */
  afterInitialize?(connection: Connection): void;
}

type AcquireCallback<T> = (connection: Connection) => Promise<T>;

interface AcquisitionQueued<T> {
  acquireCallback: AcquireCallback<T>;
  resolve(data: unknown): void;
}

interface ConnectionPoolDebug {
  /** Number of active connections. */
  connectionsCount: number;

  /** Number of idle connections. */
  idleConnectionsCount: number;

  /** Number of acquisitions queued await for an idle connection. */
  acquisitionQueueSize: number;
}

export class ConnectionPool {
  private readonly connections = new Map<Connection, void>();

  private readonly idleConnections: Connection[] = [];

  private readonly acquisitionQueue: Array<AcquisitionQueued<unknown>> = [];

  private readonly options: ConnectionOptions & ConnectionPoolOptions;

  public constructor(
    options: Partial<ConnectionPoolOptions> &
      Pick<ConnectionOptions, "database">
  ) {
    this.options = {
      host: "localhost",
      port: 3306,
      user: "root",
      connections: 20,
      idleTimeout: 60000,
      idleConnections:
        options.connections === undefined
          ? 10
          : Math.max(1, Math.floor(options.connections / 2)),
      ...options,
    };

    for (let i = 0; i < this.options.idleConnections; i++) {
      this.initializeConnection();
    }
  }

  public get debug(): ConnectionPoolDebug {
    return {
      connectionsCount: this.connections.size,
      idleConnectionsCount: this.idleConnections.length,
      acquisitionQueueSize: this.acquisitionQueue.length,
    };
  }

  /** Acquire an exclusive idle connection. */
  public async acquire<T>(acquireCallback: AcquireCallback<T>): Promise<T> {
    const connection = this.idleConnections.pop();

    if (connection === undefined) {
      if (this.connections.size < this.options.connections) {
        return this.acquireWith<T>(
          acquireCallback,
          this.initializeConnection(false)
        );
      }

      return new Promise((resolve) => {
        this.acquisitionQueue.push({ acquireCallback, resolve });
      });
    }

    return this.acquireWith<T>(acquireCallback, connection);
  }

  /** Run a query with an idle connection. */
  public async query(sql: string, args?: ExecuteArgument[]) {
    return this.acquire(async (connection) => connection.query(sql, args));
  }

  public async close() {
    return Promise.all(
      [...this.connections.keys()].map(async (connection) => connection.close())
    );
  }

  private initializeConnection(idlePush = true) {
    const connection = new Connection({
      host: this.options.host,
      port: this.options.port,
      user: this.options.user,
      password: this.options.password,
      database: this.options.database,
    });

    this.options.afterInitialize?.(connection);
    this.connections.set(connection, undefined);

    if (idlePush) {
      this.idleConnections.push(connection);
    }

    return connection;
  }

  private async acquireWith<T>(
    acquireCallback: AcquireCallback<T>,
    connection: Connection
  ) {
    return acquireCallback(connection).finally(async () => {
      this.idleConnections.push(connection);

      const acquisitionQueued = this.acquisitionQueue.shift();

      if (acquisitionQueued !== undefined) {
        const result = await this.acquire(acquisitionQueued.acquireCallback);

        acquisitionQueued.resolve(result);
      }
    });
  }
}
