import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import {
  PushRecommendation,
  Reassembler,
} from "@/Protocol/PacketReassembler/Reassembler/Reassembler.js";
import { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";

export class ReassemblerPreparedStatementResponse extends Reassembler {
  #packet: Buffer | undefined = undefined;

  #intermediateEOFFound = false;

  // eslint-disable-next-line class-methods-use-this
  public is(packet: Buffer): boolean {
    return packet.readUInt8(0) === 0x00;
  }

  public accept(packet: Buffer) {
    this.#intermediateEOFFound = packet.readUint16LE(5) === 0;
  }

  public push(packet: Buffer): PushRecommendation {
    if (PacketOk.isEOF(packet)) {
      if (this.#intermediateEOFFound) {
        return PushRecommendation.DONE;
      }

      this.#intermediateEOFFound = true;

      return PushRecommendation.INCOMPLETE;
    }

    // We need just the first packet, and ignoring first-byte header (0x00).
    if (this.#packet === undefined) {
      this.#packet = packet.subarray(1);
    }

    return PushRecommendation.INCOMPLETE;
  }

  public get() {
    return PreparedStatementResponse.from(this.#packet!);
  }
}
