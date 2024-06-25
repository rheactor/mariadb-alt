import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";
export declare enum PushRecommendation {
    INCOMPLETE = 0,
    DONE = 1,
    MORE_RESULTS = 2
}
export declare abstract class Reassembler {
    /**
     * Check if packet is a compatible data with this reassembler.
     * Just first packet is tested, because next packets are push()'ed directly if first is valid.
     */
    abstract is(packet: Buffer): boolean;
    /**
     * Run some logic if is() is true.
     */
    abstract accept(packet: Buffer): void;
    /**
     * Push a packet to this reassembler (only the payload).
     * Return a recommendation to CONTINUE or consider EOF.
     */
    abstract push(packet: Buffer): PushRecommendation;
    /**
     * Return all packed pushed as a single Buffer.
     */
    abstract get(): PacketType;
}
