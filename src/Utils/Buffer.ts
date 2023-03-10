export const readNullTerminatedString = (data: Buffer, byteOffset?: number) => {
  const nullIndexOf = data.indexOf("\0", byteOffset);

  if (nullIndexOf === -1) {
    throw Error("expected a NULL-terminated string");
  }

  return data.subarray(byteOffset, nullIndexOf);
};

export const readNullTerminatedStringEscaped = (
  data: Buffer,
  byteOffset?: number
) => {
  const buffers: Buffer[] = [];

  let byteOffsetCurrent = byteOffset;

  for (;;) {
    const nullIndexOf = data.indexOf("\0", byteOffsetCurrent);

    if (nullIndexOf === -1) {
      throw Error("expected a NULL-terminated string");
    }

    const nullEscaped = data.at(nullIndexOf + 1) === 0;

    buffers.push(data.subarray(byteOffsetCurrent, nullIndexOf + +nullEscaped));

    if (nullEscaped) {
      byteOffsetCurrent = nullIndexOf + 2;
      continue;
    }

    break;
  }

  return Buffer.concat(buffers);
};

export const toNullTerminatedStringEscaped = (data: string | null) => {
  if (data === "" || data === null) {
    return Buffer.from([0x00]);
  }

  return Buffer.from(`${data.replaceAll("\x00", "\x00\x00")}\x00`);
};

export const readStringEncoded = (
  data: Buffer,
  byteOffset = 0
): Buffer | null => {
  const bufferInt = readIntEncoded(data, byteOffset);

  if (bufferInt === null) {
    return null;
  }

  if (bufferInt === 0) {
    return Buffer.from("");
  }

  const bufferType = data.readUInt8(byteOffset);
  const bufferOffset =
    bufferType === 0xfc
      ? 3
      : bufferType === 0xfd
      ? 4
      : bufferType === 0xfe
      ? 9
      : 1;

  return data.subarray(
    byteOffset + bufferOffset,
    byteOffset + bufferOffset + Number(bufferInt)
  );
};

export const toStringEncoded = (value: string | null) => {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (value === "") {
    return Buffer.from([0x00]);
  }

  return Buffer.concat([toIntEncoded(value.length), Buffer.from(value)]);
};

export const readIntEncoded = (
  data: Buffer,
  byteOffset = 0
): bigint | number | null => {
  const bufferInt = data.readUInt8(byteOffset);

  if (bufferInt === 0xfb) {
    return null;
  }

  if (bufferInt === 0xfc) {
    return data.readUInt16LE(byteOffset + 1);
  }

  if (bufferInt === 0xfd) {
    return data.readUintLE(byteOffset + 1, 3);
  }

  if (bufferInt === 0xfe) {
    return data.readBigUInt64LE(byteOffset + 1);
  }

  return bufferInt;
};

export const toIntEncoded = (value: bigint | number | null) => {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (typeof value === "bigint") {
    const bufferBigInt = Buffer.allocUnsafe(9);

    bufferBigInt.writeUInt8(0xfe);
    bufferBigInt.writeBigUint64LE(value, 1);

    return bufferBigInt;
  }

  if (value > 0xfa) {
    const inputBigger = Number(value > 0xffff);
    const bufferInt = Buffer.allocUnsafe(3 + inputBigger);

    bufferInt.writeUInt8(0xfc + inputBigger);
    bufferInt.writeUIntLE(value, 1, 2 + inputBigger);

    return bufferInt;
  }

  return Buffer.from([value]);
};

export const bufferXOR = (bufferA: Buffer, bufferB: Buffer) => {
  if (bufferA.length !== bufferB.length) {
    throw Error("both Buffer instances must have the same size");
  }

  const bufferResult = Buffer.allocUnsafe(bufferA.length);

  for (let i = 0; i < bufferA.length; i++) {
    bufferResult[i] = bufferA[i]! ^ bufferB[i]!;
  }

  return bufferResult;
};
