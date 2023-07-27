import { Exception } from "@/Exceptions/Exception";
import { type PacketError } from "@/Protocol/Packet/PacketError";
import { type PacketType } from "@/Protocol/PacketReassembler/PacketReassembler";

export const expectedOKPacket = (packet: PacketError | PacketType) =>
  new UnexpectedResponseTypeException(
    "received ResultSet instead of OK response",
  ).setDetails(undefined, { packet });

export const expectedResultSetPacket = (packet: PacketError | PacketType) =>
  new UnexpectedResponseTypeException(
    "received OK instead of ResultSet response",
  ).setDetails(undefined, { packet });

export class UnexpectedResponseTypeException extends Exception<{
  packet: PacketError | PacketType;
}> {}
