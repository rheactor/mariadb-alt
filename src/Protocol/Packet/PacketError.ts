export class PacketError {
  private constructor(
    public message: string,
    public code: number,
    public state: string,
  ) {}

  public static from(packet: Buffer) {
    return new PacketError(
      packet.subarray(8).toString("binary"),
      packet.readUInt16LE(),
      packet.subarray(3, 8).toString("binary"),
    );
  }

  public static is(packet: Buffer) {
    return packet.readUInt8() === 0xff;
  }
}
