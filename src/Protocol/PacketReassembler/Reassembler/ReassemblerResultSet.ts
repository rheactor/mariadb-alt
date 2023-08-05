import { PacketError } from "@/Protocol/Packet/PacketError";
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

  // eslint-disable-next-line class-methods-use-this
  public accept() {
    // empty
  }

  public push(packet: Buffer): PushRecommendation {
    if (PacketOk.isEOF(packet)) {
      if (this.#intermediateEOFFound) {
        return PacketOk.from(packet.subarray(1)).hasMoreResults()
          ? PushRecommendation.MORE_RESULTS
          : PushRecommendation.DONE;
      }

      this.#intermediateEOFFound = true;

      return PushRecommendation.INCOMPLETE;
    }

    this.packets.push(packet);

    return PushRecommendation.INCOMPLETE;
  }
}

export class ReassemblerResultSet extends ReassemblerResultSetPartial {
  public get() {
    return new PacketResultSet(Buffer.concat(this.packets));
  }
}
