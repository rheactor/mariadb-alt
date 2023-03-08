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
  public static create(body: Buffer, sequence = 0) {
    const packet = Buffer.alloc(4 + body.length);

    packet.writeIntLE(body.length, 0, 3);
    packet.writeInt8(sequence, 3);
    packet.set(body, 4);

    return new Packet(packet);
  }

  /** Creates a simple PING Packet instance. */
  public static createPing(sequence = 0) {
    return this.create(Buffer.from("\x0E"), sequence);
  }

  /** Split this Packet into a lot of Packet[]. */
  public split(length: number): Packet[] {
    const packets: Packet[] = [];

    for (let i = 0; i < this.length; i += length) {
      packets.push(
        Packet.create(this.body.subarray(i, i + length), packets.length)
      );
    }

    return packets;
  }
}
