import { PacketError } from "@/Protocol/Packet/PacketError.js";
import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import type { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import type { Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler.js";
import type { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
import type { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";
export type PacketType = PacketOk | PacketResultSet | PreparedStatementResponse | PreparedStatementResultSet;
type OnDoneCallback = (packets: PacketType[], error?: PacketError) => void;
type Constructor<T> = new () => T;
export declare class PacketReassembler {
    #private;
    constructor(onDoneCallback: OnDoneCallback, reassembler?: Constructor<Reassembler> | undefined);
    push(buffer: Buffer): void;
}
export {};
