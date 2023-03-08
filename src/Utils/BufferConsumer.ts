import { readNullTerminatedString } from "@/Utils/Buffer";

export class BufferConsumer {
  private byteOffset = 0;

  public constructor(private readonly buffer: Buffer) {}

  public readInt(byteLength = 1): number {
    const bufferInt = this.buffer.readUIntLE(this.byteOffset, byteLength);

    this.byteOffset += byteLength;

    return bufferInt;
  }

  public readNullTerminatedString(): Buffer {
    const bufferString = readNullTerminatedString(this.buffer, this.byteOffset);

    this.byteOffset += bufferString.length + 1;

    return bufferString;
  }

  public readString(bytes: number, nullTerminated = false): Buffer {
    const bufferString = this.buffer.subarray(
      this.byteOffset,
      this.byteOffset + bytes
    );

    this.byteOffset += bytes + +nullTerminated;

    return bufferString;
  }

  public skip(bytes = 1) {
    this.byteOffset += bytes;
  }
}
