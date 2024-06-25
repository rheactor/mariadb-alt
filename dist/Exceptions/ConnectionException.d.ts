import { Exception } from "@/Exceptions/Exception.js";
import type { PacketError } from "@/Protocol/Packet/PacketError.js";
export declare class ConnectionException extends Exception<{
    packetError: PacketError;
}> {
}
