import { type PacketType } from "@/Protocol/PacketReassembler/PacketReassembler";

export enum PushRecommendation {
  CONTINUE,
  EOF,
}

export abstract class Reassembler {
  /**
   * Check if packet is a compatible data with this reassembler.
   * Just first packet is tested, because next packets are push()'ed directly if first is valid.
   */
  public abstract is(packet: Buffer): boolean;

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