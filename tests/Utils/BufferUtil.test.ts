import {
  bufferXOR,
  createUInt16LE,
  createUInt24LE,
  createUInt32LE,
  createUInt64LE,
  readIntEncoded,
  readNullTerminatedString,
  readNullTerminatedStringEscaped,
  readStringEncoded,
  toIntEncoded,
  toNullTerminatedStringEscaped,
  toStringEncoded,
} from "@/Utils/BufferUtil";

describe("Utils/BufferUtil", () => {
  type ReadNTSUnit = [Buffer, Buffer, number?];

  const readNullTerminatedStringUnits: ReadNTSUnit[] = [
    [Buffer.from("\0"), Buffer.from("")],
    [Buffer.from("AA\0"), Buffer.from("AA")],
    [Buffer.from("AA\0BB"), Buffer.from("AA")],
    [Buffer.from("AA\0BB"), Buffer.from("AA"), 0],
    [Buffer.from("AA\0BB"), Buffer.from("A"), 1],
  ];

  describe.each(readNullTerminatedStringUnits)(
    "readNullTerminatedString()",
    (input, output, byteOffset) => {
      const inputJSON = JSON.stringify(input.toString("binary"));

      test(`${inputJSON} at ${byteOffset ?? 0}`, () => {
        expect(readNullTerminatedString(input, byteOffset)).toStrictEqual(
          output
        );
      });
    }
  );

  describe("readNullTerminatedString()", () => {
    test("expects a NULL-terminated string", () => {
      expect(() => readNullTerminatedString(Buffer.from(""))).toThrowError(
        "expected a NULL-terminated string"
      );
    });
  });

  const readNullTerminatedStringEscapedUnits: ReadNTSUnit[] = [
    ...readNullTerminatedStringUnits,
    [Buffer.from("AA\0BB\0"), Buffer.from("AA")],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("AA\0BB\0CC")],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("A\0BB\0CC"), 1],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("\0BB\0CC"), 2],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from(""), 3],
  ];

  describe.each(readNullTerminatedStringEscapedUnits)(
    "readNullTerminatedStringEscaped()",
    (input, output, byteOffset) => {
      const inputJSON = JSON.stringify(input.toString("binary"));

      test(`${inputJSON} at ${byteOffset ?? 0}`, () => {
        expect(
          readNullTerminatedStringEscaped(input, byteOffset)
        ).toStrictEqual(output);
      });
    }
  );

  describe("readNullTerminatedStringEscaped()", () => {
    test("expects a NULL-terminated string", () => {
      expect(() =>
        readNullTerminatedStringEscaped(Buffer.from(""))
      ).toThrowError("expected a NULL-terminated string");

      expect(() =>
        readNullTerminatedStringEscaped(Buffer.from("AA\0\0AA"))
      ).toThrowError("expected a NULL-terminated string");
    });
  });

  type ToNTSUnit = [string | null, Buffer];

  const toNullTerminatedStringEscapedUnits: ToNTSUnit[] = [
    [null, Buffer.from("\0")],
    ["", Buffer.from("\0")],
    ["ABC", Buffer.from("ABC\0")],
    ["AA\0BB\0CC", Buffer.from("AA\0\0BB\0\0CC\0")],
  ];

  describe.each(toNullTerminatedStringEscapedUnits)(
    "toNullTerminatedStringEscaped()",
    (input, output) => {
      test(`${JSON.stringify(input?.toString() ?? "null")}`, () => {
        expect(toNullTerminatedStringEscaped(input)).toStrictEqual(output);
      });
    }
  );

  type ReadIntEncodedUnit = [
    Buffer,
    ReturnType<typeof readIntEncoded>,
    number?
  ];

  const readIntEncodedUnits: ReadIntEncodedUnit[] = [
    [Buffer.from([0x00]), 0],
    [Buffer.from([0x10]), 16],
    [Buffer.from([0xfa]), 250],
    [Buffer.from([0xfb]), null],
    [Buffer.from([0x00, 0xfb]), null, 1],
    [Buffer.from([0xfc, 0x10, 0x20]), 0x2010],
    [Buffer.from([0xfd, 0x10, 0x20, 0x30]), 0x302010],
    [
      Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]),
      0x80706050_40302010n,
    ],
  ];

  describe.each(readIntEncodedUnits)(
    "readIntEncoded()",
    (input, output, byteOffset) => {
      const inputString = JSON.stringify(input.toString("hex"));

      test(`0x${inputString} at ${byteOffset ?? 0}`, () => {
        expect(readIntEncoded(input, byteOffset)).toStrictEqual(output);
      });
    }
  );

  type ToIntEncodedUnit = [Parameters<typeof toIntEncoded>[0], Buffer];

  const toIntEncodedUnits: ToIntEncodedUnit[] = [
    [0, Buffer.from([0x00])],
    [16, Buffer.from([0x10])],
    [250, Buffer.from([0xfa])],
    [null, Buffer.from([0xfb])],
    [255, Buffer.from([0xfc, 0xff, 0x00])],
    [0x2010, Buffer.from([0xfc, 0x10, 0x20])],
    [0x302010, Buffer.from([0xfd, 0x10, 0x20, 0x30])],
    [
      0x80706050_40302010n,
      Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]),
    ],
  ];

  describe.each(toIntEncodedUnits)("toIntEncoded()", (input, output) => {
    const inputString = JSON.stringify(
      typeof input === "bigint" ? input.toString(16) : input
    );

    test(inputString, () => {
      expect(toIntEncoded(input)).toStrictEqual(output);
    });
  });

  type ReadStringEncodedUnit = [Buffer, Buffer | null, number?];

  const bufferStr1 = Buffer.from("a");
  const bufferStr250 = Buffer.allocUnsafe(250).fill("a");
  const bufferStr255 = Buffer.allocUnsafe(255).fill("b");
  const bufferStr400 = Buffer.allocUnsafe(400).fill("c");

  const readStringEncodedUnits: ReadStringEncodedUnit[] = [
    [Buffer.from([0xfb]), null],
    [Buffer.from([0x00]), Buffer.from("")],
    [Buffer.from([0xff, 0x00]), Buffer.from(""), 1],
    [Buffer.concat([Buffer.from([0x01]), bufferStr1]), bufferStr1],
    [Buffer.concat([Buffer.from([0xfa]), bufferStr250]), bufferStr250],
    [
      Buffer.concat([Buffer.from([0xfc, 0xfa, 0x00]), bufferStr250]),
      bufferStr250,
    ],
    [
      Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferStr255]),
      bufferStr255,
    ],
    [
      Buffer.concat([Buffer.from([0xfd, 0x90, 0x01, 0x00]), bufferStr400]),
      bufferStr400,
    ],
    [
      Buffer.concat([Buffer.from([0xfd, 0x00, 0x90, 0x01]), bufferStr400]),
      bufferStr400,
    ],
    [
      Buffer.concat([
        Buffer.from([0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x90, 0x01]),
        bufferStr400,
      ]),
      bufferStr400,
    ],
  ];

  describe.each(readStringEncodedUnits)(
    "readStringEncoded()",
    (input, output, byteOffset) => {
      test(`Buffer of length ${output?.length ?? "null"} at ${
        byteOffset ?? 0
      }`, () => {
        expect(readStringEncoded(input, byteOffset)).toStrictEqual(output);
      });
    }
  );

  type ToStringEncodedUnit = [string | null, Buffer];

  const toStringEncodedUnits: ToStringEncodedUnit[] = [
    [null, Buffer.from([0xfb])],
    ["", Buffer.from([0x00])],
    [
      "\x4f\x6c\xc3\xa1\x2c\x20\x6d\x75\x6e\x64\x6f\x21",
      Buffer.concat([Buffer.from([0x0c]), Buffer.from("Olá, mundo!")]),
    ],
    [
      bufferStr1.toString("binary"),
      Buffer.concat([Buffer.from([0x01]), bufferStr1]),
    ],
    [
      bufferStr250.toString("binary"),
      Buffer.concat([Buffer.from([0xfa]), bufferStr250]),
    ],
    [
      bufferStr255.toString("binary"),
      Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferStr255]),
    ],
  ];

  describe.each(toStringEncodedUnits)("toStringEncoded()", (input, output) => {
    test(`Buffer of length ${input?.length ?? "null"}`, () => {
      expect(toStringEncoded(input)).toStrictEqual(output);
    });
  });

  describe("bufferXOR()", () => {
    test("XOR between two Buffer's", () => {
      expect(
        bufferXOR(
          Buffer.from([0b1100_1111, 0b1111_1111, 0b10101010, 0b1111_0000]),
          Buffer.from([0b0011_1010, 0b0000_0000, 0b10101010, 0b1111_1111])
        )
      ).toStrictEqual(
        Buffer.from([0b1111_0101, 0b1111_1111, 0b0000_0000, 0b0000_1111])
      );
    });

    test("XOR between two Buffer's", () => {
      expect(() =>
        bufferXOR(Buffer.from([0x00]), Buffer.from([]))
      ).toThrowError("both Buffer instances must have the same size");
    });
  });

  describe("createUInt{16, 24, 32, 64}LE()", () => {
    test("createUInt16LE()", () => {
      expect(createUInt16LE(0x0000)).toStrictEqual(Buffer.from([0x00, 0x00]));
      expect(createUInt16LE(0x1020)).toStrictEqual(Buffer.from([0x20, 0x10]));
      expect(createUInt16LE(0xffff)).toStrictEqual(Buffer.from([0xff, 0xff]));
    });

    test("createUInt24LE()", () => {
      expect(createUInt24LE(0x000000)).toStrictEqual(
        Buffer.from([0x00, 0x00, 0x00])
      );
      expect(createUInt24LE(0x102030)).toStrictEqual(
        Buffer.from([0x30, 0x20, 0x10])
      );
      expect(createUInt24LE(0xffffff)).toStrictEqual(
        Buffer.from([0xff, 0xff, 0xff])
      );
    });

    test("createUInt32LE()", () => {
      expect(createUInt32LE(0x000000)).toStrictEqual(
        Buffer.from([0x00, 0x00, 0x00, 0x00])
      );
      expect(createUInt32LE(0x10203040)).toStrictEqual(
        Buffer.from([0x40, 0x30, 0x20, 0x10])
      );
      expect(createUInt32LE(0xffffffff)).toStrictEqual(
        Buffer.from([0xff, 0xff, 0xff, 0xff])
      );
    });

    test("createUInt64LE()", () => {
      expect(createUInt64LE(0x0000000000000000n)).toStrictEqual(
        Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      );
      expect(createUInt64LE(0x1020304050607080n)).toStrictEqual(
        Buffer.from([0x80, 0x70, 0x60, 0x50, 0x40, 0x30, 0x20, 0x10])
      );
      expect(createUInt64LE(0xf0f0f0f0f0f0f0f0n)).toStrictEqual(
        Buffer.from([0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0])
      );
    });
  });
});
