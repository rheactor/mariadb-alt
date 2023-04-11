import { Connection, type ConnectionOptions } from "@/Connection";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { removeItem } from "@/Utils/ArrayUtil";
import { TimerUtil } from "@/Utils/TimerUtil";

interface ConnectionPoolOptions {
  /**
   * Connections limit.
   * Default is 20.
   */
  connections: number;

  /**
   * Connection release time when idle in ms.
   * Set as `undefined` means never release by idle timeout.
   * Default is 60000 (1 minute).
   */
  idleTimeout?: number;

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
  private readonly connections = new Map<Connection, TimerUtil>();

  private readonly idleConnections: Connection[] = [];

  private readonly acquisitionQueue: Array<AcquisitionQueued<unknown>> = [];

  private readonly options: ConnectionOptions & ConnectionPoolOptions;

  public constructor(
    options: ConstructorParameters<typeof Connection>[0] &
      Partial<ConnectionPoolOptions>
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
          this.initializeConnection()
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

  private initializeConnection() {
    const connection = new Connection({
      host: this.options.host,
      port: this.options.port,
      user: this.options.user,
      password: this.options.password,
      database: this.options.database,
    });

    const connectionTimer = new TimerUtil(() => {
      if (this.idleConnections.length > this.options.idleConnections) {
        connection.close();
      }
    }, this.options.idleTimeout);

    this.options.afterInitialize?.(connection);
    this.connections.set(connection, connectionTimer);
    this.idleConnections.push(connection);

    connection.once("closed", () => {
      this.connections.delete(connection);
      removeItem(this.idleConnections, connection);
    });

    return connection;
  }

  private async acquireWith<T>(
    acquireCallback: AcquireCallback<T>,
    connection: Connection
  ) {
    const connectionTimer = this.connections.get(connection)!;

    connectionTimer.stop();
    removeItem(this.idleConnections, connection);

    return acquireCallback(connection).finally(async () => {
      this.idleConnections.push(connection);
      connectionTimer.restart();

      const acquisitionQueued = this.acquisitionQueue.shift();

      if (acquisitionQueued !== undefined) {
        const result = await this.acquire(acquisitionQueued.acquireCallback);

        acquisitionQueued.resolve(result);
      }
    });
  }
}
