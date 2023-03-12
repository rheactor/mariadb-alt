import { PacketError } from "@/Protocol/Packet/PacketError";

export class PacketErrorState extends PacketError {
  public state: string;

  public constructor(public code: number, packet: Buffer) {
    super(code, packet.subarray(5));

    this.state = packet.subarray(0, 5).toString("binary");
  }
}
