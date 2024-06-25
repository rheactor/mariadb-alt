import { Exception } from "@/Exceptions/Exception.js";
import type { PacketError } from "@/Protocol/Packet/PacketError.js";
import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";
export declare function expectedOKPacket(packet: PacketError | PacketType): UnexpectedResponseTypeException;
export declare function expectedResultSetPacket(packet: PacketError | PacketType): UnexpectedResponseTypeException;
export declare class UnexpectedResponseTypeException extends Exception<{
    packet: PacketError | PacketType;
}> {
}
