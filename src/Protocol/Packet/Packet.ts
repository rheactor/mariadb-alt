import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketProgress } from "@/Protocol/Packet/PacketProgress";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import { BufferConsumer } from "@/Utils/BufferConsumer";

export type PacketKind =
  | PacketError
  | PacketOk
  | PacketProgress
  | PacketResultSet;

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

  /** Create a PacketOK or PacketError, depending of data Buffer content. */
  public static fromResponse(data: Buffer) {
    const bufferConsumer = new BufferConsumer(data, 4);
    const bufferType = bufferConsumer.readUInt();

    if (bufferType === 0x00 || bufferType === 0xfe) {
      return new PacketOk(bufferConsumer.rest());
    }

    if (bufferType !== 0xff) {
      return new PacketResultSet(bufferConsumer.rest(-1));
    }

    const bufferErrorCode = bufferConsumer.readUInt(2);

    if (bufferErrorCode === 0xffff) {
      return new PacketProgress(bufferConsumer.rest());
    }

    const bufferStateMarker = bufferConsumer.readString(1);

    if (bufferStateMarker.at(0) === 0x23) {
      return new PacketErrorState(bufferErrorCode, bufferConsumer.rest());
    }

    return new PacketError(bufferErrorCode, bufferConsumer.rest(-1));
  }

  /** Creates a simple PING Packet instance. */
  public static createPing(sequence: number) {
    return this.from(Buffer.from("\x0E"), sequence);
  }
}
