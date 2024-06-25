import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import { PushRecommendation, Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler.js";
export declare abstract class ReassemblerResultSetPartial extends Reassembler {
    #private;
    protected readonly packets: Buffer[];
    is(packet: Buffer): boolean;
    accept(): void;
    push(packet: Buffer): PushRecommendation;
}
export declare class ReassemblerResultSet extends ReassemblerResultSetPartial {
    get(): PacketResultSet;
}
