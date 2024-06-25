export declare class PacketError {
    message: string;
    code: number;
    state: string;
    private constructor();
    static from(packet: Buffer): PacketError;
    static is(packet: Buffer): boolean;
}
