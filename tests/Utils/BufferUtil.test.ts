import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import {
  bufferXOR,
  chunk,
  createUInt16LE,
  createUInt24LE,
  createUInt32LE,
  createUInt64LE,
  generateNullBitmap,
  getFieldsPositions,
  readDatetimeEncoded,
  readIntEncoded,
  readNullTerminatedString,
  readNullTerminatedStringEscaped,
  readStringEncoded,
  readTimeEncoded,
  toDatetimeEncoded,
  toIntEncoded,
  toNullTerminatedStringEscaped,
  toStringEncoded,
  toTimeEncoded,
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

  type ToDatetimeEncodedUnit = [
    [number, number, number, number, number, number, number],
    Buffer
  ];

  const toDatetimeEncodedUnits: ToDatetimeEncodedUnit[] = [
    [[0, 0, 0, 0, 0, 0, 0], Buffer.from([0])],
    [[2023, 3, 4, 0, 0, 0, 0], Buffer.from([4, 0xe7, 0x07, 0x03, 0x04])],
    [
      [2023, 3, 4, 10, 20, 30, 0],
      Buffer.from([7, 0xe7, 0x07, 3, 4, 10, 20, 30]),
    ],
    [
      [2023, 3, 4, 10, 20, 30, 123456],
      Buffer.from([11, 0xe7, 0x07, 3, 4, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
    ],
    [
      [0, 0, 0, 0, 0, 0, 123000],
      Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x78, 0xe0, 0x01, 0x00]),
    ],
    [
      [0, 0, 0, 0, 0, 0, 123],
      Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x7b, 0, 0, 0]),
    ],
  ];

  describe.each(toDatetimeEncodedUnits)(
    "toDatetimeEncoded()",
    ([year, month, day, hours, minutes, seconds, ms], output) => {
      test(
        JSON.stringify({ year, month, day, hours, minutes, seconds, ms }),
        () => {
          expect(
            toDatetimeEncoded(year, month, day, hours, minutes, seconds, ms)
          ).toStrictEqual(output);
        }
      );
    }
  );

  describe("toDatetimeEncoded()", () => {
    test("no args", () => {
      expect(toDatetimeEncoded()).toStrictEqual(Buffer.from([0]));
    });
  });

  type ReadDatetimeEncodedUnit = [Buffer, DateTimeFormat];

  const readDatetimeEncodedUnits: ReadDatetimeEncodedUnit[] = [
    [Buffer.from([0]), DateTimeFormat.from(0, 0, 0, 0, 0, 0, 0)],
    [
      Buffer.from([4, 0xe7, 0x07, 0x03, 0x04]),
      DateTimeFormat.from(2023, 3, 4, 0, 0, 0, 0),
    ],
    [
      Buffer.from([7, 0xe7, 0x07, 3, 4, 10, 20, 30]),
      DateTimeFormat.from(2023, 3, 4, 10, 20, 30, 0),
    ],
    [
      Buffer.from([11, 0xe7, 0x07, 3, 4, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
      DateTimeFormat.from(2023, 3, 4, 10, 20, 30, 123456),
    ],
    [
      Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x78, 0xe0, 0x01, 0x00]),
      DateTimeFormat.from(0, 0, 0, 0, 0, 0, 123000),
    ],
    [
      Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x7b, 0, 0, 0]),
      DateTimeFormat.from(0, 0, 0, 0, 0, 0, 123),
    ],
  ];

  describe.each(readDatetimeEncodedUnits)(
    "readDatetimeEncoded()",
    (input, output) => {
      test(JSON.stringify(output), () => {
        expect(readDatetimeEncoded(input)).toStrictEqual(output);
      });
    }
  );

  type ToTimeEncodedUnit = [[number, number, number, number], Buffer];

  const toTimeEncodedUnits: ToTimeEncodedUnit[] = [
    [[0, 0, 0, 0], Buffer.from([0])],
    [[10, 20, 30, 0], Buffer.from([8, 0, 0, 0, 0, 0, 10, 20, 30])],
    [
      [10, 20, 30, 123456],
      Buffer.from([12, 0, 0, 0, 0, 0, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
    ],
    [[64, 20, 30, 0], Buffer.from([8, 0, 2, 0, 0, 0, 16, 20, 30])],
    [[-64, 20, 30, 0], Buffer.from([8, 1, 2, 0, 0, 0, 16, 20, 30])],
    [
      [-2899, 27, 30, 1],
      Buffer.from([
        0x0c, 0x01, 0x78, 0x00, 0x00, 0x00, 0x13, 0x1b, 0x1e, 0x01, 0x00, 0x00,
        0x00,
      ]),
    ],
    [
      [-2899, 27, 30, 0],
      Buffer.from([0x08, 0x01, 0x78, 0x00, 0x00, 0x00, 0x13, 0x1b, 0x1e]),
    ],
  ];

  describe.each(toTimeEncodedUnits)(
    "toTimeEncoded()",
    ([hours, minutes, seconds, ms], output) => {
      test(JSON.stringify({ hours, minutes, seconds, ms }), () => {
        expect(toTimeEncoded(hours, minutes, seconds, ms)).toStrictEqual(
          output
        );
      });
    }
  );

  describe("toTimeEncoded()", () => {
    test("no args", () => {
      expect(toTimeEncoded()).toStrictEqual(Buffer.from([0]));
    });
  });

  type ReadTimeEncodedUnit = [Buffer, TimeFormat];

  const readTimeEncodedUnits: ReadTimeEncodedUnit[] = [
    [Buffer.from([0]), TimeFormat.from(0, 0, 0, 0)],
    [
      Buffer.from([8, 0, 0, 0, 0, 0, 10, 20, 30]),
      TimeFormat.from(10, 20, 30, 0),
    ],
    [
      Buffer.from([12, 0, 0, 0, 0, 0, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
      TimeFormat.from(10, 20, 30, 123456),
    ],
    [
      Buffer.from([8, 0, 2, 0, 0, 0, 16, 20, 30]),
      TimeFormat.from(64, 20, 30, 0),
    ],
    [
      Buffer.from([8, 1, 2, 0, 0, 0, 16, 20, 30]),
      TimeFormat.from(-64, 20, 30, 0),
    ],
    [
      Buffer.from([
        0x0c, 0x01, 0x78, 0x00, 0x00, 0x00, 0x13, 0x1b, 0x1e, 0x01, 0x00, 0x00,
        0x00,
      ]),
      TimeFormat.from(-2899, 27, 30, 1),
    ],
    [
      Buffer.from([0x08, 0x01, 0x78, 0x00, 0x00, 0x00, 0x13, 0x1b, 0x1e]),
      TimeFormat.from(-2899, 27, 30, 0),
    ],
  ];

  describe.each(readTimeEncodedUnits)("readTimeEncoded()", (input, output) => {
    test(JSON.stringify(output), () => {
      expect(readTimeEncoded(input)).toStrictEqual(output);
    });
  });

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

  type ToStringEncodedUnit = [Buffer | string | null, Buffer];

  const toStringEncodedUnits: ToStringEncodedUnit[] = [
    [null, Buffer.from([0xfb])],
    ["", Buffer.from([0x00])],
    [Buffer.from("test"), Buffer.from("\x04test")],
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

  type FieldsPositionsUnit = [Buffer, number, number[]];

  const fieldsPositionsUnits: FieldsPositionsUnit[] = [
    [Buffer.from([0b0000_0000]), 1, [0]],
    [Buffer.from([0b0000_0001]), 1, []],
    [Buffer.from([0b0000_0000]), 2, [0, 1]],
    [Buffer.from([0b0000_0010]), 2, [0]],
    [Buffer.from([0b0000_0001]), 2, [1]],
    [Buffer.from([0b0000_0011]), 2, []],
    [Buffer.from([0b1111_1111]), 8, []],
    [Buffer.from([0b0000_0000]), 8, [0, 1, 2, 3, 4, 5, 6, 7]],
    [Buffer.from([0b0000_0000, 0b1111_1111]), 16, [0, 1, 2, 3, 4, 5, 6, 7]],
    [Buffer.from([0b1111_1111, 0b1111_1111]), 16, []],
    [Buffer.from([0b0101_0101, 0b0101_0101]), 16, [1, 3, 5, 7, 9, 11, 13, 15]],
    [Buffer.from([0b0101_0101, 0b0000_0001]), 10, [1, 3, 5, 7, 9]],
    [Buffer.from([0b0101_0101, 0b0000_0011]), 10, [1, 3, 5, 7]],
  ];

  describe.each(fieldsPositionsUnits)(
    "getNullBitmapPositions()",
    (nullBitmap, fieldsCount, output) => {
      const nullBitmapTitle = nullBitmap
        .toJSON()
        .data[0]?.toString(2)
        .padStart(8, "0");

      test(`${nullBitmapTitle} with ${fieldsCount} field(s)`, () => {
        expect(getFieldsPositions(nullBitmap, fieldsCount)).toStrictEqual(
          output
        );
      });
    }
  );

  type NullBitmapUnit = [unknown[], Buffer];

  const nullBitmapsUnits: NullBitmapUnit[] = [
    [[1], Buffer.from([0b0000_0000])],
    [[null], Buffer.from([0b0000_0001])],
    [[1, null], Buffer.from([0b0000_0010])],
    [[null, null], Buffer.from([0b0000_0011])],
    [[null, null, 1], Buffer.from([0b0000_0011])],
    [[null, 1, null], Buffer.from([0b0000_0101])],
    [[1, 1, null], Buffer.from([0b0000_0100])],
    [[1, null, null], Buffer.from([0b0000_0110])],
    [
      [null, null, null, null, null, null, null, null, 1, 2, 3, 4, 5, 6, 7, 8],
      Buffer.from([0b1111_1111, 0b0000_0000]),
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, null, null, null, null, null, null, null, null],
      Buffer.from([0b0000_0000, 0b1111_1111]),
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, null, null, null, null],
      Buffer.from([0b0000_0000, 0b0000_1111]),
    ],
    [
      [null, null, null, null, 1, 2, 3, 4, 5, 6, 7, 8],
      Buffer.from([0b0000_1111, 0b0000_0000]),
    ],
  ];

  describe.each(nullBitmapsUnits)("generateNullBitmap()", (args, output) => {
    test(JSON.stringify(args), () => {
      expect(generateNullBitmap(args)).toStrictEqual(output);
    });
  });

  type ChunkUnit = [Buffer, number, Buffer[]];

  const chunkUnits: ChunkUnit[] = [
    [Buffer.from(""), 3, [Buffer.from("")]],
    [Buffer.from("a"), 3, [Buffer.from("a")]],
    [Buffer.from("ab"), 3, [Buffer.from("ab")]],
    [Buffer.from("abc"), 3, [Buffer.from("abc")]],
    [Buffer.from("abcd"), 3, [Buffer.from("abc"), Buffer.from("d")]],
    [Buffer.from("abcde"), 3, [Buffer.from("abc"), Buffer.from("de")]],
    [Buffer.from("abcdef"), 3, [Buffer.from("abc"), Buffer.from("def")]],
    [
      Buffer.from("abcdef"),
      2,
      [Buffer.from("ab"), Buffer.from("cd"), Buffer.from("ef")],
    ],
    [
      Buffer.from("abcde"),
      2,
      [Buffer.from("ab"), Buffer.from("cd"), Buffer.from("e")],
    ],
    [
      Buffer.from("abcdef"),
      1,
      [
        Buffer.from("a"),
        Buffer.from("b"),
        Buffer.from("c"),
        Buffer.from("d"),
        Buffer.from("e"),
        Buffer.from("f"),
      ],
    ],
  ];

  describe.each(chunkUnits)("chunk()", (input, size, output) => {
    test(`${input.toJSON().data} size ${size}`, () => {
      expect(chunk(input, size)).toStrictEqual(output);
    });
  });
});
