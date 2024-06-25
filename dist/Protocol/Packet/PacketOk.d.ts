export declare class PacketOk {
    readonly affectedRows: bigint | number;
    readonly lastInsertId: bigint | number;
    readonly serverStatus: number;
    readonly warningCount: number;
    constructor(affectedRows: bigint | number, lastInsertId: bigint | number, serverStatus: number, warningCount: number);
    static from(packet: Buffer): PacketOk;
    static is(packet: Buffer): boolean;
    static isEOF(packet: Buffer): boolean;
    hasMoreResults(): boolean;
}
