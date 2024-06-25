import type { Exception } from "@/Exceptions/Exception.js";
import { PacketError } from "@/Protocol/Packet/PacketError.js";
import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import type { Row } from "@/Protocol/Packet/PacketResultSet.js";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";
import type { ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement.js";
import type { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";
import type { Awaitable } from "@/Utils/TypesUtil.js";
declare const enum Status {
    CONNECTING = 0,
    AUTHENTICATING = 1,
    READY = 2,
    EXECUTING = 3,
    ERROR = 4
}
export interface ConnectionOptions {
    /** Connection host. Default is "localhost". */
    host: string;
    /** Connection port number. Default is 3306. */
    port: number;
    /** Connection user. Default is "root". */
    user: string;
    /** Connection password. Default is empty. */
    password?: string;
    /** Connection database. Default is none. */
    database: string;
    /** Do something with the connection after it is authenticated. */
    afterAuthenticated?(this: Connection): Awaitable<void>;
}
type ConnectionEventsError = "error";
type ConnectionEventsCommon = "authenticated" | "authenticating" | "closed" | "connected";
declare abstract class ConnectionEvents {
    #private;
    on(eventName: ConnectionEventsError, listener: (connection: Connection, error: Exception) => void): void;
    on(eventName: ConnectionEventsCommon, listener: (connection: Connection) => void): void;
    once(eventName: ConnectionEventsError, listener: (connection: Connection, error: Exception) => void): void;
    once(eventName: ConnectionEventsCommon, listener: (connection: Connection) => void): void;
    emit(eventName: ConnectionEventsCommon | ConnectionEventsError, ...args: unknown[]): void;
}
export declare class Connection extends ConnectionEvents {
    #private;
    status: Status;
    constructor(options: Partial<ConnectionOptions> & Pick<ConnectionOptions, "database">);
    get wasUsed(): boolean;
    private get currentTransactionCommands();
    isConnected(): boolean;
    hasError(): boolean;
    isAuthenticating(): boolean;
    hasAuthenticated(): boolean;
    ping(): Promise<PacketError | PacketOk | PacketResultSet | PreparedStatementResponse | PreparedStatementResultSet | undefined>;
    queryRaw(sql: string, args?: ExecuteArgument[]): Promise<PacketError | PacketOk | PacketResultSet | PreparedStatementResponse | PreparedStatementResultSet | undefined>;
    query<T extends object = Row>(sql: string, args?: ExecuteArgument[]): Promise<Generator<T, void, unknown>>;
    execute(sql: string, args?: ExecuteArgument[]): Promise<PacketOk>;
    batchQueryRaw(sql: string): Promise<(PacketError | PacketType)[]>;
    batchQuery<T extends object = Row>(sql: string): Promise<Generator<T, void, unknown>[]>;
    batchExecute(sql: string): Promise<PacketOk[]>;
    transaction(callback: () => Awaitable<boolean | void>): Promise<void>;
    close(): Promise<void>;
    reset(): Promise<PacketError | PacketOk | PacketResultSet | PreparedStatementResponse | PreparedStatementResultSet | undefined>;
}
export {};
