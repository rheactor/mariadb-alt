import { ServerStatus } from "@/Protocol/Enumerations";
import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketOk {
  public constructor(
    public readonly affectedRows: bigint | number,
    public readonly lastInsertId: bigint | number,
    public readonly serverStatus: number,
    public readonly warningCount: number
  ) {}

  public static from(packet: Buffer) {
    // EOF Packet (will be transformed into a OK Packet).
    if (packet.length === 4) {
      return new PacketOk(0, 0, packet.readUInt16LE(2), packet.readUInt16LE());
    }

    // OK Packet.
    const bufferConsumer = new BufferConsumer(packet);

    return new PacketOk(
      bufferConsumer.readIntEncoded()!,
      bufferConsumer.readIntEncoded()!,
      bufferConsumer.readUInt(2),
      bufferConsumer.readUInt(2)
    );
  }

  public static is(packet: Buffer) {
    return (
      (packet.readUInt8() === 0x00 && packet.length >= 7) || this.isEOF(packet)
    );
  }

  public static hasMoreResults(packet: Buffer) {
    return (
      packet.readUInt8() === 0x00 &&
      (packet.readUIntLE(3, 2) & ServerStatus.MORE_RESULTS) !== 0
    );
  }

  public static isEOF(packet: Buffer) {
    return packet.readUInt8() === 0xfe && packet.length === 5;
  }
}
