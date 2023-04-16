import { chunk } from "@/Utils/BufferUtil";

export class Packet {
  /** Packet 3-byte length. */
  public readonly length: number;

  /** Packet sequence. */
  public readonly sequence: number;

  /** Packet body. */
  public readonly body: Buffer;

  /** Creates a new Packet based on a Buffer. */
  public constructor(packet: Buffer) {
    this.sequence = packet.readInt8(3);
    this.body = packet.subarray(4, packet.readIntLE(0, 3) + 4);
    this.length = this.body.length;
  }

  /** Creates the packet buffer. */
  public static from(input: Buffer, sequence: number) {
    const packets: Buffer[] = [];

    for (const buffer of chunk(input, 0xffffff)) {
      const packet = Buffer.alloc(4 + buffer.length);

      packet.writeUIntLE(buffer.length, 0, 3);
      packet.writeUInt8((sequence + packets.length) & 0xff, 3);
      packet.set(buffer, 4);

      packets.push(packet);
    }

    // When the packet is sent exactly at the chunk boundary (16MB),
    // we need to send an additional empty packet.
    if ((input.length & 0xffffff) === 0xffffff) {
      packets.push(
        Buffer.from([
          // Length: 0 bytes.
          0,
          0,
          0,
          // Sequence: next.
          (sequence + packets.length) & 0xff,
        ])
      );
    }

    return Buffer.concat(packets);
  }
}
