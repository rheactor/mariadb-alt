export class PacketError {
  public constructor(
    public code: number,
    public state: string,
    public message: string
  ) {}

  public static from(packet: Buffer) {
    return new PacketError(
      packet.readUInt16LE(),
      packet.subarray(3, 8).toString("binary"),
      packet.subarray(8).toString("binary")
    );
  }

  public static is(packet: Buffer) {
    return packet.readUInt8() === 0xff;
  }
}
