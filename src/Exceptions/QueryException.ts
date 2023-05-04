import { Exception } from "@/Exceptions/Exception";
import { type PacketError } from "@/Protocol/Packet/PacketError";

export class QueryException extends Exception<{ packetError: PacketError }> {}
