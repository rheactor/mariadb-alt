import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import {
  PushRecommendation,
  Reassembler,
} from "@/Protocol/PacketReassembler/Reassembler/Reassembler";

export class ReassemblerResultSet extends Reassembler {
  private readonly packets: Buffer[] = [];

  private intermediateEOFFound = false;

  // eslint-disable-next-line class-methods-use-this
  public is(packet: Buffer): boolean {
    return !PacketOk.is(packet) && !PacketError.is(packet);
  }

  public push(packet: Buffer): PushRecommendation {
    if (PacketOk.isEOF(packet)) {
      if (this.intermediateEOFFound) {
        return PushRecommendation.EOF;
      }

      this.intermediateEOFFound = true;

      return PushRecommendation.CONTINUE;
    }

    this.packets.push(packet);

    return PushRecommendation.CONTINUE;
  }

  public get() {
    return new PacketResultSet(Buffer.concat(this.packets));
  }
}
