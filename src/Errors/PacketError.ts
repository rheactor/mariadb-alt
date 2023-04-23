export class PacketError extends Error {
  public code!: number;

  public state!: string;

  public static from(packet: Buffer) {
    const error = new PacketError(packet.subarray(8).toString("binary"));

    error.code = packet.readUInt16LE();
    error.state = packet.subarray(3, 8).toString("binary");

    return error;
  }

  public static is(packet: Buffer) {
    return packet.readUInt8() === 0xff;
  }
}
