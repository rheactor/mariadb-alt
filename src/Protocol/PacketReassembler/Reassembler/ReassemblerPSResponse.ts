import { PacketOk } from "@/Protocol/Packet/PacketOk";
import {
  PushRecommendation,
  Reassembler,
} from "@/Protocol/PacketReassembler/Reassembler/Reassembler";
import { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";

export class ReassemblerPSResponse extends Reassembler {
  private packet: Buffer | undefined = undefined;

  private intermediateEOFFound = false;

  // eslint-disable-next-line class-methods-use-this
  public is(packet: Buffer): boolean {
    if (packet.readUInt8(0) === 0x00) {
      this.intermediateEOFFound = packet.readUint8(5) === 0;

      return true;
    }

    return false;
  }

  public push(packet: Buffer): PushRecommendation {
    if (PacketOk.isEOF(packet)) {
      if (this.intermediateEOFFound) {
        return PushRecommendation.EOF;
      }

      this.intermediateEOFFound = true;

      return PushRecommendation.CONTINUE;
    }

    // We need just the first packet, and ignoring first-byte header (0x00).
    if (this.packet === undefined) {
      this.packet = packet.subarray(1);
    }

    return PushRecommendation.CONTINUE;
  }

  public get() {
    return PreparedStatementResponse.from(this.packet!);
  }
}
