import { Connection } from "@/Connection.js";
import type { Row } from "@/Protocol/Packet/PacketResultSet.js";
import type { ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement.js";
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
export declare class ConnectionPool {
    #private;
    constructor(options: ConstructorParameters<typeof Connection>[0] & Partial<ConnectionPoolOptions>);
    get debug(): ConnectionPoolDebug;
    /** Acquire an exclusive idle connection. */
    acquire<T>(acquireCallback: AcquireCallback<T>, options?: AcquireOptions): Promise<T>;
    queryRaw(sql: string, args?: ExecuteArgument[]): Promise<import("./Protocol/Packet/PacketError.js").PacketError | import("./Protocol/Packet/PacketOk.js").PacketOk | import("@/Protocol/Packet/PacketResultSet.js").PacketResultSet | import("./Protocol/PreparedStatement/PreparedStatementResponse.js").PreparedStatementResponse | import("./Protocol/PreparedStatement/PreparedStatementResultSet.js").PreparedStatementResultSet | undefined>;
    query<T extends object = Row>(sql: string, args?: ExecuteArgument[]): Promise<Generator<T, void, unknown>>;
    execute(sql: string, args?: ExecuteArgument[]): Promise<import("./Protocol/Packet/PacketOk.js").PacketOk>;
    batchQueryRaw(sql: string): Promise<(import("./Protocol/Packet/PacketError.js").PacketError | import("./Protocol/PacketReassembler/PacketReassembler.js").PacketType)[]>;
    batchQuery(sql: string): Promise<Generator<Row, void, unknown>[]>;
    batchExecute(sql: string): Promise<import("./Protocol/Packet/PacketOk.js").PacketOk[]>;
    close(): Promise<void[]>;
}
export {};
