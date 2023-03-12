export class PacketError {
  public message: string;

  public constructor(public code: number, packet: Buffer) {
    this.message = packet.toString("binary");
  }
}
