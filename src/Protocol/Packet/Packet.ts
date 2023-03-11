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

  /** Creates a new Packet. */
  public static from(body: Buffer, sequence: number) {
    const buffer = Buffer.alloc(4 + body.length);

    buffer.writeIntLE(body.length, 0, 3);
    buffer.writeInt8(sequence, 3);
    buffer.set(body, 4);

    return buffer;
  }

  /** Creates a simple PING Packet instance. */
  public static createPing(sequence: number) {
    return this.from(Buffer.from("\x0E"), sequence);
  }

  /** Split this Packet into a lot of Packet[]. */
  public split(length: number): Packet[] {
    const packets: Packet[] = [];

    for (let i = 0; i < this.length; i += length) {
      packets.push(
        new Packet(
          Packet.from(this.body.subarray(i, i + length), packets.length)
        )
      );
    }

    return packets;
  }
}
