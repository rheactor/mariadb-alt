import { PushRecommendation, Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler.js";
import { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
export declare class ReassemblerPreparedStatementResponse extends Reassembler {
    #private;
    is(packet: Buffer): boolean;
    accept(packet: Buffer): void;
    push(packet: Buffer): PushRecommendation;
    get(): PreparedStatementResponse;
}
