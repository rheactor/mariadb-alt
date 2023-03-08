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
