import { type PacketError } from "@/Protocol/Packet/PacketError";
import { type PacketType } from "@/Protocol/PacketReassembler/PacketReassembler";

export class ResponseNotAllowedError extends Error {
  public cause?: PacketError | PacketType;

  public static expectedOKPacket(cause: PacketError | PacketType) {
    return new ResponseNotAllowedError(
      "received ResultSet instead of OK response",
      { cause }
    );
  }

  public static expectedResultSetPacket(cause: PacketError | PacketType) {
    return new ResponseNotAllowedError(
      "received OK instead of ResultSet response",
      { cause }
    );
  }
}
