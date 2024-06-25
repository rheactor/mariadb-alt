import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import { BufferConsumer } from "@/Utils/BufferConsumer.js";

export function readNullTerminatedString(data: Buffer, byteOffset?: number) {
  const nullIndexOf = data.indexOf("\0", byteOffset);

  if (nullIndexOf === -1) {
    throw new Error("expected a NULL-terminated string");
  }

  return data.subarray(byteOffset, nullIndexOf);
}

export function toNullTerminatedStringEscaped(data: string | null) {
  if (data === "" || data === null) {
    return Buffer.from([0x00]);
  }

  return Buffer.from(`${data.replaceAll("\u0000", "\u0000\u0000")}\u0000`);
}

export function toStringEncoded(value: Buffer | string | null) {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (value === "") {
    return Buffer.from([0x00]);
  }

  if (value instanceof Buffer) {
    return Buffer.concat([toIntEncoded(value.length), value]);
  }

  return Buffer.concat([
    toIntEncoded(value.length),
    Buffer.from(value, "binary"),
  ]);
}

export function toDatetimeEncoded(
  year = 0,
  month = 0,
  day = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Buffer {
  const hasDate = year !== 0 || month !== 0 || day !== 0;
  const hasTime = hours !== 0 || minutes !== 0 || seconds !== 0;
  const hasMs = ms !== 0;

  if (hasDate || hasTime || hasMs) {
    const yearBuffer = Buffer.alloc(2);

    yearBuffer.writeInt16LE(year);

    if (hasTime || hasMs) {
      if (hasMs) {
        const msBuffer = Buffer.alloc(4);

        msBuffer.writeUint32LE(ms);

        return Buffer.concat([
          Buffer.from([11]),
          yearBuffer,
          Buffer.from([month, day, hours, minutes, seconds]),
          msBuffer,
        ]);
      }

      return Buffer.concat([
        Buffer.from([7]),
        yearBuffer,
        Buffer.from([month, day, hours, minutes, seconds]),
      ]);
    }

    return Buffer.concat([
      Buffer.from([4]),
      yearBuffer,
      Buffer.from([month, day]),
    ]);
  }

  return Buffer.from([0]);
}

export function readDatetimeEncoded(buffer: Buffer): DateTimeFormat {
  const bufferConsumer = new BufferConsumer(buffer);
  const format = bufferConsumer.readInt();

  return DateTimeFormat.from(
    format > 0 ? bufferConsumer.readInt(2) : 0,
    format > 0 ? bufferConsumer.readInt() : 0,
    format > 0 ? bufferConsumer.readInt() : 0,
    format > 4 ? bufferConsumer.readInt() : 0,
    format > 4 ? bufferConsumer.readInt() : 0,
    format > 4 ? bufferConsumer.readInt() : 0,
    format > 7 ? bufferConsumer.readInt(4) : 0,
  );
}

export function toTimeEncoded(
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Buffer {
  if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
    return Buffer.from([0]);
  }

  const hoursAbsolute = Math.abs(hours);
  const daysBuffer = Buffer.alloc(4);

  daysBuffer.writeUint32LE(Math.floor(hoursAbsolute / 24));

  if (ms !== 0) {
    const msBuffer = Buffer.alloc(4);

    msBuffer.writeUint32LE(ms);

    return Buffer.concat([
      Buffer.from([12, Number(hours < 0)]),
      daysBuffer,
      Buffer.from([hoursAbsolute % 24, minutes, seconds]),
      msBuffer,
    ]);
  }

  return Buffer.concat([
    Buffer.from([8, Number(hours < 0)]),
    daysBuffer,
    Buffer.from([hoursAbsolute % 24, minutes, seconds]),
  ]);
}

export function readTimeEncoded(buffer: Buffer): TimeFormat {
  const bufferConsumer = new BufferConsumer(buffer);
  const format = bufferConsumer.readInt();

  if (format === 0) {
    return TimeFormat.from(0, 0, 0, 0);
  }

  const hours =
    (bufferConsumer.readBoolean() ? -1 : 1) *
    (bufferConsumer.readUInt(4) * 24 + bufferConsumer.readUInt());
  const minutes = bufferConsumer.readUInt();
  const seconds = bufferConsumer.readUInt();

  if (format === 12) {
    return TimeFormat.from(hours, minutes, seconds, bufferConsumer.readUInt(4));
  }

  return TimeFormat.from(hours, minutes, seconds, 0);
}

function toBigIntEncoded(value: bigint) {
  const bufferBigInt = Buffer.allocUnsafe(9);

  bufferBigInt.writeUInt8(0xfe);
  bufferBigInt.writeBigUint64LE(value, 1);

  return bufferBigInt;
}

export function toIntEncoded(value: bigint | number | null) {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (typeof value === "bigint") {
    return toBigIntEncoded(value);
  }

  if (value > 0xfa) {
    if (value > 16_777_215) {
      return toBigIntEncoded(BigInt(value));
    }

    const inputBigger = Number(value > 65_535);
    const bufferInt = Buffer.allocUnsafe(3 + inputBigger);

    bufferInt.writeUInt8(0xfc + inputBigger);
    bufferInt.writeUIntLE(value, 1, 2 + inputBigger);

    return bufferInt;
  }

  return Buffer.from([value]);
}

export function bufferXOR(bufferA: Buffer, bufferB: Buffer) {
  if (bufferA.length !== bufferB.length) {
    throw new Error("both Buffer instances must have the same size");
  }

  const bufferResult = Buffer.allocUnsafe(bufferA.length);

  for (const [index, element] of bufferA.entries()) {
    bufferResult[index] = element ^ bufferB[index]!;
  }

  return bufferResult;
}

export function createUInt8(value: number) {
  const buffer = Buffer.allocUnsafe(1);

  buffer.writeUInt8(value);

  return buffer;
}

export function createInt8(value: number) {
  const buffer = Buffer.allocUnsafe(1);

  buffer.writeInt8(value);

  return buffer;
}

export function createUInt16LE(value: number) {
  const buffer = Buffer.allocUnsafe(2);

  buffer.writeUInt16LE(value);

  return buffer;
}

export function createInt16LE(value: number) {
  const buffer = Buffer.allocUnsafe(2);

  buffer.writeInt16LE(value);

  return buffer;
}

export function createUInt32LE(value: number) {
  const buffer = Buffer.allocUnsafe(4);

  buffer.writeUInt32LE(value);

  return buffer;
}

export function createInt32LE(value: number) {
  const buffer = Buffer.allocUnsafe(4);

  buffer.writeInt32LE(value);

  return buffer;
}

export function createUInt64LE(value: bigint) {
  const buffer = Buffer.allocUnsafe(8);

  buffer.writeBigUInt64LE(value);

  return buffer;
}

export function createInt64LE(value: bigint) {
  const buffer = Buffer.allocUnsafe(8);

  buffer.writeBigInt64LE(value);

  return buffer;
}

export function getNullPositions(
  nullBitmap: Buffer,
  fieldsCount: number,
  offset: number,
): number[] {
  const positions: number[] = [];

  let currentByte = 0;
  let currentBit = offset;

  for (let index = 0; index < fieldsCount; index++) {
    const byte = nullBitmap[currentByte]!;

    if ((byte & (1 << currentBit)) !== 0) {
      positions.push(index);
    }

    if (++currentBit > 7) {
      currentByte++;
      currentBit = 0;
    }
  }

  return positions;
}

export function generateNullBitmap(args: unknown[]): Buffer {
  const nullBitmap = Array.from({
    length: Math.floor((args.length + 7) / 8),
  }).fill(0) as number[];

  for (const [index, argument] of args.entries()) {
    if (argument === null) {
      const bit = Math.floor(index / 8);

      nullBitmap[bit]! |= 1 << (index - bit * 8);
    }
  }

  return Buffer.from(nullBitmap);
}

export function chunk(buffer: Buffer, size: number) {
  if (buffer.length < size) {
    return [buffer];
  }

  const buffers: Buffer[] = [];

  for (let index = 0; index < buffer.length; index += size) {
    const blockSize = Math.min(buffer.length - index, size);

    buffers.push(buffer.subarray(index, index + blockSize));
  }

  return buffers;
}
