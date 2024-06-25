import { Exception } from "@/Exceptions/Exception.js";
import type { PacketError } from "@/Protocol/Packet/PacketError.js";
import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";

export function expectedOKPacket(packet: PacketError | PacketType) {
  return new UnexpectedResponseTypeException(
    "received ResultSet instead of OK response",
  ).setDetails(undefined, { packet });
}

export function expectedResultSetPacket(packet: PacketError | PacketType) {
  return new UnexpectedResponseTypeException(
    "received OK instead of ResultSet response",
  ).setDetails(undefined, { packet });
}

export class UnexpectedResponseTypeException extends Exception<{
  packet: PacketError | PacketType;
}> {}
