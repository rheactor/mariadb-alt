import {
  readIntEncoded,
  readNullTerminatedString,
  readNullTerminatedStringEscaped,
  readStringEncoded,
  toIntEncoded,
  toNullTerminatedStringEscaped,
  toStringEncoded,
} from "@/Utils/Buffer";

describe("Buffer", () => {
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
      test(`${JSON.stringify(input.toString())} at ${byteOffset ?? 0}`, () => {
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
      test(`${JSON.stringify(input.toString())} at ${byteOffset ?? 0}`, () => {
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
    [bufferStr1.toString(), Buffer.concat([Buffer.from([0x01]), bufferStr1])],
    [
      bufferStr250.toString(),
      Buffer.concat([Buffer.from([0xfa]), bufferStr250]),
    ],
    [
      bufferStr255.toString(),
      Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferStr255]),
    ],
  ];

  describe.each(toStringEncodedUnits)("toStringEncoded()", (input, output) => {
    test(`Buffer of length ${input?.length ?? "null"}`, () => {
      expect(toStringEncoded(input)).toStrictEqual(output);
    });
  });
});
