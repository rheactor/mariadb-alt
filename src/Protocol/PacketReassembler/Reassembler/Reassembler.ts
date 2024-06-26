import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";

export enum PushRecommendation {
  // Packet is incomplete, more data incoming.
  INCOMPLETE,
  // Packet is complete.
  DONE,
  // Packet is complete, but new packet is incoming.
  MORE_RESULTS,
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Reassembler {
  /**
   * Check if packet is a compatible data with this reassembler.
   * Just first packet is tested, because next packets are push()'ed directly if first is valid.
   */
  public abstract is(packet: Buffer): boolean;

  /**
   * Run some logic if is() is true.
   */
  public abstract accept(packet: Buffer): void;

  /**
   * Push a packet to this reassembler (only the payload).
   * Return a recommendation to CONTINUE or consider EOF.
   */
  public abstract push(packet: Buffer): PushRecommendation;

  /**
   * Return all packed pushed as a single Buffer.
   */
  public abstract get(): PacketType;
}
