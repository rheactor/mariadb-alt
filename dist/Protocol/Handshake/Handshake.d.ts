export declare class Handshake {
    /** DBMS protocol version (eg. MariaDB 10.x === 10). */
    protocolVersion: number;
    /** DBMS server version (eg. "5.5.5-10.11.2-MariaDB"). */
    serverVersion: Buffer;
    /** Connection ID 32-byte. */
    connectionId: number;
    /** Authentication seed 8-bytes (Scramble #1). */
    authSeed: Buffer;
    /** Authentication plugin name. */
    authPluginName: Buffer;
    /** Length of auth_plugin_data (scramble) if greater than 0 and capabilities has CLIENT_PLUGIN_AUTH. */
    authPluginNameLength: number;
    /** Server capabilities. */
    capabilities: bigint;
    /** Server default collation. */
    defaultCollation: number;
    /** Server status. */
    serverStatus: number;
    constructor(data: Buffer);
}
