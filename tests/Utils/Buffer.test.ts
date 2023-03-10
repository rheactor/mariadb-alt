import {
  readIntEncoded,
  readNullTerminatedString,
  readNullTerminatedStringEscapable,
  toIntEncoded,
} from "@/Utils/Buffer";

describe("Buffer", () => {
  type NTSUnit = [Buffer, Buffer, number?];

  const readNullTerminatedStringUnits: NTSUnit[] = [
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

  const readNullTerminatedStringEscapableUnits: NTSUnit[] = [
    ...readNullTerminatedStringUnits,
    [Buffer.from("AA\0BB\0"), Buffer.from("AA")],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("AA\0BB\0CC")],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("A\0BB\0CC"), 1],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from("\0BB\0CC"), 2],
    [Buffer.from("AA\0\0BB\0\0CC\0"), Buffer.from(""), 3],
  ];

  describe.each(readNullTerminatedStringEscapableUnits)(
    "readNullTerminatedStringEscapable()",
    (input, output, byteOffset) => {
      test(`${JSON.stringify(input.toString())} at ${byteOffset ?? 0}`, () => {
        expect(
          readNullTerminatedStringEscapable(input, byteOffset)
        ).toStrictEqual(output);
      });
    }
  );

  describe("readNullTerminatedStringEscapable()", () => {
    test("expects a NULL-terminated string", () => {
      expect(() =>
        readNullTerminatedStringEscapable(Buffer.from(""))
      ).toThrowError("expected a NULL-terminated string");

      expect(() =>
        readNullTerminatedStringEscapable(Buffer.from("AA\0\0AA"))
      ).toThrowError("expected a NULL-terminated string");
    });
  });

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
});
