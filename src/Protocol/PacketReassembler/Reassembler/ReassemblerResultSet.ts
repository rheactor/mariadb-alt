import { PacketError } from "@/Errors/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import {
  PushRecommendation,
  Reassembler,
} from "@/Protocol/PacketReassembler/Reassembler/Reassembler";

export abstract class ReassemblerResultSetPartial extends Reassembler {
  protected readonly packets: Buffer[] = [];

  #intermediateEOFFound = false;

  // eslint-disable-next-line class-methods-use-this
  public is(packet: Buffer): boolean {
    return !PacketOk.is(packet) && !PacketError.is(packet);
  }

  public push(packet: Buffer): PushRecommendation {
    if (PacketOk.isEOF(packet)) {
      if (this.#intermediateEOFFound) {
        return PacketOk.hasMoreResults(packet)
          ? PushRecommendation.EOF_THEN_REPEAT
          : PushRecommendation.EOF;
      }

      this.#intermediateEOFFound = true;

      return PushRecommendation.CONTINUE;
    }

    this.packets.push(packet);

    return PushRecommendation.CONTINUE;
  }
}

export class ReassemblerResultSet extends ReassemblerResultSetPartial {
  public get() {
    return new PacketResultSet(Buffer.concat(this.packets));
  }
}
