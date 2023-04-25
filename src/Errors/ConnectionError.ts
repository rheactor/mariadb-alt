import { type PacketError } from "@/Protocol/Packet/PacketError";

export class ConnectionError extends Error {
  public cause!: PacketError;
}
