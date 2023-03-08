import {
  readNullTerminatedString,
  readNullTerminatedStringEscapable,
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
});
