import type { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import type { TimeFormat } from "@/Formats/TimeFormat.js";
import {
  readDatetimeEncoded,
  readNullTerminatedString,
  readTimeEncoded,
} from "@/Utils/BufferUtil.js";

export class BufferConsumer {
  readonly #buffer: Buffer;

  #byteOffset = 0;

  public constructor(buffer: Buffer, byteOffset = 0) {
    this.#buffer = buffer;
    this.#byteOffset = byteOffset;
  }

  public at(byteOffset = 0): number {
    return this.#buffer.readUInt8(this.#byteOffset + byteOffset);
  }

  public readUInt(byteLength = 1): number {
    const bufferInt = this.#buffer.readUIntLE(this.#byteOffset, byteLength);

    this.#byteOffset += byteLength;

    return bufferInt;
  }

  public readInt(byteLength = 1): number {
    const bufferInt = this.#buffer.readIntLE(this.#byteOffset, byteLength);

    this.#byteOffset += byteLength;

    return bufferInt;
  }

  public readUBigInt(): bigint {
    const bufferInt = this.#buffer.readBigUInt64LE(this.#byteOffset);

    this.#byteOffset += 8;

    return bufferInt;
  }

  public readBigInt(): bigint {
    const bufferInt = this.#buffer.readBigInt64LE(this.#byteOffset);

    this.#byteOffset += 8;

    return bufferInt;
  }

  public readIntEncoded(): bigint | number | null {
    const bufferInt = this.#buffer.readUInt8(this.#byteOffset++);

    if (bufferInt === 0x00) {
      return 0;
    }

    if (bufferInt === 0xfb) {
      return null;
    }

    if (bufferInt === 0xfc) {
      return this.readUInt(2);
    }

    if (bufferInt === 0xfd) {
      return this.readUInt(3);
    }

    if (bufferInt === 0xfe) {
      const bufferBigInt = this.#buffer.readBigUInt64LE(this.#byteOffset);

      this.#byteOffset += 8;

      return bufferBigInt;
    }

    return bufferInt;
  }

  public readBoolean(): boolean {
    return Boolean(this.#buffer.readInt8(this.#byteOffset++));
  }

  public readNullTerminatedString(): Buffer {
    const bufferString = readNullTerminatedString(
      this.#buffer,
      this.#byteOffset,
    );

    this.#byteOffset += bufferString.length + 1;

    return bufferString;
  }

  public readString(bytes: number, nullTerminated = false): Buffer {
    const bufferString = this.#buffer.subarray(
      this.#byteOffset,
      this.#byteOffset + bytes,
    );

    this.#byteOffset += bytes + +nullTerminated;

    return bufferString;
  }

  public readStringEncoded(): Buffer | null {
    const bufferInt = this.readIntEncoded();

    if (bufferInt === null) {
      return null;
    }

    if (bufferInt === 0) {
      return Buffer.from("");
    }

    const bufferString = this.#buffer.subarray(
      this.#byteOffset,
      this.#byteOffset + Number(bufferInt),
    );

    this.#byteOffset += bufferString.length;

    return bufferString;
  }

  public readDatetimeEncoded(): DateTimeFormat {
    return readDatetimeEncoded(this.slice(this.at() + 1));
  }

  public readTimeEncoded(): TimeFormat {
    return readTimeEncoded(this.slice(this.at() + 1));
  }

  public slice(bytes: number): Buffer {
    const bufferSliced = this.#buffer.subarray(
      this.#byteOffset,
      (this.#byteOffset += bytes),
    );

    return bufferSliced;
  }

  public skip(bytes = 1) {
    this.#byteOffset += bytes;

    return this;
  }

  public skipStringEncoded() {
    const bufferInt = this.readIntEncoded();

    if (bufferInt === null || bufferInt === 0) {
      return this;
    }

    this.#byteOffset += Number(bufferInt);

    return this;
  }

  public consumed() {
    return this.#byteOffset === this.#buffer.length;
  }
}
