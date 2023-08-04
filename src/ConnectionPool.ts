import { Connection, type ConnectionOptions } from "@/Connection";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement";
import { removeItem } from "@/Utils/ArrayUtil";
import { TimerUtil } from "@/Utils/TimerUtil";

interface ConnectionPoolOptions {
  /**
   * Connections limit.
   * Default is 20.
   */
  connections: number;

  /**
   * Connections hard-limit.
   * When you force acquire(..., { immediate: true }), hard-limit will be checked.
   * Default is undefined ("unlimited").
   */
  connectionsHardLimit?: number;

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
}

type AcquireCallback<T> = (connection: Connection) => Promise<T>;

interface AcquisitionQueued<T> {
  options: AcquireOptions;
  acquireCallback: AcquireCallback<T>;
  resolve(data: unknown): void;
}

interface AcquireOptions {
  renew?: boolean;
  immediate?: boolean;
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
  readonly #connections = new Map<Connection, TimerUtil>();

  readonly #idleConnections: Connection[] = [];

  readonly #acquisitionQueue: Array<AcquisitionQueued<unknown>> = [];

  readonly #options: ConnectionOptions & ConnectionPoolOptions;

  public constructor(
    options: ConstructorParameters<typeof Connection>[0] &
      Partial<ConnectionPoolOptions>,
  ) {
    this.#options = {
      host: "localhost",
      port: 3306,
      user: "root",
      connections: 20,
      idleTimeout: 60_000,
      idleConnections:
        options.connections === undefined
          ? 10
          : Math.max(1, Math.floor(options.connections / 2)),
      ...options,
    };

    for (let index = 0; index < this.#options.idleConnections; index++) {
      this.#initializeConnection();
    }
  }

  public get debug(): ConnectionPoolDebug {
    return {
      connectionsCount: this.#connections.size,
      idleConnectionsCount: this.#idleConnections.length,
      acquisitionQueueSize: this.#acquisitionQueue.length,
    };
  }

  /** Acquire an exclusive idle connection. */
  public async acquire<T>(
    acquireCallback: AcquireCallback<T>,
    options: AcquireOptions = {},
  ): Promise<T> {
    const connection = this.#idleConnections.pop();

    if (connection === undefined) {
      if (
        // Immediate acquisitions must happen immediately.
        // But still needs respect hard-limit, if set.
        (options.immediate === true &&
          (this.#options.connectionsHardLimit === undefined ||
            this.#connections.size < this.#options.connectionsHardLimit)) ||
        // Else, just consider soft-limit connections.
        this.#connections.size < this.#options.connections
      ) {
        return this.#acquireWith<T>(
          acquireCallback,
          this.#initializeConnection(),
        );
      }

      return new Promise((resolve) => {
        this.#acquisitionQueue.push({ options, acquireCallback, resolve });
      });
    }

    if (options.renew === true && connection.wasUsed) {
      return connection
        .reset()
        .then(async () =>
          this.#acquireWith<T>(acquireCallback, this.#initializeConnection()),
        );
    }

    return this.#acquireWith<T>(acquireCallback, connection);
  }

  public async queryRaw(sql: string, args?: ExecuteArgument[]) {
    return this.acquire(async (connection) => connection.queryRaw(sql, args));
  }

  public async query<T extends object = Row>(
    sql: string,
    args?: ExecuteArgument[],
  ) {
    return this.acquire(async (connection) => connection.query<T>(sql, args));
  }

  public async execute(sql: string, args?: ExecuteArgument[]) {
    return this.acquire(async (connection) => connection.execute(sql, args));
  }

  public async batchQueryRaw(sql: string) {
    return this.acquire(async (connection) => connection.batchQueryRaw(sql));
  }

  public async batchQuery(sql: string) {
    return this.acquire(async (connection) => connection.batchQuery(sql));
  }

  public async batchExecute(sql: string) {
    return this.acquire(async (connection) => connection.batchExecute(sql));
  }

  public async close() {
    return Promise.all(
      [...this.#connections.keys()].map(async (connection) =>
        connection.close(),
      ),
    );
  }

  #initializeConnection() {
    // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
    const that = this;
    const connection = new Connection({
      host: this.#options.host,
      port: this.#options.port,
      user: this.#options.user,
      password: this.#options.password,
      database: this.#options.database,
      async afterAuthenticated() {
        return that.#options.afterAuthenticated?.apply(this);
      },
    });

    const connectionTimer = new TimerUtil(() => {
      if (this.#idleConnections.length > this.#options.idleConnections) {
        void connection.close();
      }
    }, this.#options.idleTimeout);

    this.#connections.set(connection, connectionTimer);
    this.#idleConnections.push(connection);

    connection.once("closed", () => {
      connectionTimer.stop();
      this.#connections.delete(connection);
      removeItem(this.#idleConnections, connection);
    });

    return connection;
  }

  async #acquireWith<T>(
    acquireCallback: AcquireCallback<T>,
    connection: Connection,
  ) {
    const connectionTimer = this.#connections.get(connection)!;

    connectionTimer.stop();
    removeItem(this.#idleConnections, connection);

    return acquireCallback(connection).finally(async () => {
      if (this.#connections.size > this.#options.connections) {
        void connection.close();

        return;
      }

      this.#idleConnections.push(connection);
      connectionTimer.restart();

      const acquisitionQueued = this.#acquisitionQueue.shift();

      if (acquisitionQueued !== undefined) {
        const result = await this.acquire(
          acquisitionQueued.acquireCallback,
          acquisitionQueued.options,
        );

        acquisitionQueued.resolve(result);
      }
    });
  }
}
