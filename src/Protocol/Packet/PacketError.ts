export class PacketError {
  public message: string;

  public constructor(public code: number, packet: Buffer) {
    this.message = packet.toString("binary");
  }

  public static is(packet: Buffer) {
    return packet.readUInt8(4) === 0xff;
  }
}
