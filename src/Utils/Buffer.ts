export const readNullTerminatedString = (data: Buffer, byteOffset?: number) => {
  const nullIndexOf = data.indexOf("\0", byteOffset);

  if (nullIndexOf === -1) {
    throw Error("expected a NULL-terminated string");
  }

  return data.subarray(byteOffset, nullIndexOf);
};

export const readNullTerminatedStringEscapable = (
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
