import { expect, test } from "vitest";

import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import {
  bufferXOR,
  chunk,
  createUInt16LE,
  createUInt32LE,
  generateNullBitmap,
  getNullPositions,
  readDatetimeEncoded,
  readNullTerminatedString,
  readTimeEncoded,
  toDatetimeEncoded,
  toIntEncoded,
  toNullTerminatedStringEscaped,
  toStringEncoded,
  toTimeEncoded,
} from "@/Utils/BufferUtil";

type ReadNTSTest = [input: Buffer, byteOffset: number, output: Buffer];

const readNTSTests: ReadNTSTest[] = [
  [Buffer.from("\0"), 0, Buffer.from("")],
  [Buffer.from("AA\0"), 0, Buffer.from("AA")],
  [Buffer.from("AA\0BB"), 0, Buffer.from("AA")],
  [Buffer.from("AA\0BB"), 0, Buffer.from("AA")],
  [Buffer.from("AA\0BB"), 1, Buffer.from("A")],
];

test.each(readNTSTests)(
  "call readNullTerminatedString(%j, %j) === %j",
  (input, byteOffset, output) => {
    expect(readNullTerminatedString(input, byteOffset)).toStrictEqual(output);
  },
);

test('call readNullTerminatedString("") must thrown', () => {
  expect(() => readNullTerminatedString(Buffer.from(""))).toThrow(
    "expected a NULL-terminated string",
  );
});

type ToNTSEscapedTest = [input: string | null, output: Buffer];

const toNTSEscapedTests: ToNTSEscapedTest[] = [
  [null, Buffer.from("\0")],
  ["", Buffer.from("\0")],
  ["ABC", Buffer.from("ABC\0")],
  ["AA\0BB\0CC", Buffer.from("AA\0\0BB\0\0CC\0")],
];

test.each(toNTSEscapedTests)(
  "call toNullTerminatedStringEscaped(%j) === %j",
  (input, output) => {
    expect(toNullTerminatedStringEscaped(input)).toStrictEqual(output);
  },
);

type ToDatetimeEncodedTest = [
  input: [
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    seconds: number,
    ms: number,
  ],
  output: Buffer,
];

const toDatetimeEncodedTests: ToDatetimeEncodedTest[] = [
  [[0, 0, 0, 0, 0, 0, 0], Buffer.from([0])],
  [[2023, 3, 4, 0, 0, 0, 0], Buffer.from([4, 0xe7, 0x07, 0x03, 0x04])],
  [[2023, 3, 4, 10, 20, 30, 0], Buffer.from([7, 0xe7, 0x07, 3, 4, 10, 20, 30])],
  [
    [2023, 3, 4, 10, 20, 30, 123_456],
    Buffer.from([11, 0xe7, 0x07, 3, 4, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
  ],
  [
    [0, 0, 0, 0, 0, 0, 123_000],
    Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x78, 0xe0, 0x01, 0x00]),
  ],
  [
    [0, 0, 0, 0, 0, 0, 123],
    Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x7b, 0, 0, 0]),
  ],
];

test.each(toDatetimeEncodedTests)(
  "call toDatetimeEncoded(... %j) === %j",
  ([year, month, day, hours, minutes, seconds, ms], output) => {
    expect(
      toDatetimeEncoded(year, month, day, hours, minutes, seconds, ms),
    ).toStrictEqual(output);
  },
);

test("call toDatetimeEncoded(... no args)", () => {
  expect(toDatetimeEncoded()).toStrictEqual(Buffer.from([0]));
});

type ReadDatetimeEncodedTest = [input: Buffer, output: DateTimeFormat];

const readDatetimeEncodedTests: ReadDatetimeEncodedTest[] = [
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
    DateTimeFormat.from(2023, 3, 4, 10, 20, 30, 123_456),
  ],
  [
    Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x78, 0xe0, 0x01, 0x00]),
    DateTimeFormat.from(0, 0, 0, 0, 0, 0, 123_000),
  ],
  [
    Buffer.from([11, 0, 0, 0, 0, 0, 0, 0, 0x7b, 0, 0, 0]),
    DateTimeFormat.from(0, 0, 0, 0, 0, 0, 123),
  ],
];

test.each(readDatetimeEncodedTests)(
  "call readDatetimeEncoded(%j) === %j",
  (input, output) => {
    expect(readDatetimeEncoded(input)).toStrictEqual(output);
  },
);

type ToTimeEncodedTest = [
  input: [number, number, number, number],
  output: Buffer,
];

const toTimeEncodedTests: ToTimeEncodedTest[] = [
  [[0, 0, 0, 0], Buffer.from([0])],
  [[10, 20, 30, 0], Buffer.from([8, 0, 0, 0, 0, 0, 10, 20, 30])],
  [
    [10, 20, 30, 123_456],
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

test.each(toTimeEncodedTests)(
  "call toTimeEncoded(... %j) === %j",
  ([hours, minutes, seconds, ms], output) => {
    expect(toTimeEncoded(hours, minutes, seconds, ms)).toStrictEqual(output);
  },
);

test("call toTimeEncoded(... no args)", () => {
  expect(toTimeEncoded()).toStrictEqual(Buffer.from([0]));
});

type ReadTimeEncodedTest = [input: Buffer, output: TimeFormat];

const readTimeEncodedTests: ReadTimeEncodedTest[] = [
  [Buffer.from([0]), TimeFormat.from(0, 0, 0, 0)],
  [Buffer.from([8, 0, 0, 0, 0, 0, 10, 20, 30]), TimeFormat.from(10, 20, 30, 0)],
  [
    Buffer.from([12, 0, 0, 0, 0, 0, 10, 20, 30, 0x40, 0xe2, 0x01, 0x00]),
    TimeFormat.from(10, 20, 30, 123_456),
  ],
  [Buffer.from([8, 0, 2, 0, 0, 0, 16, 20, 30]), TimeFormat.from(64, 20, 30, 0)],
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

test.each(readTimeEncodedTests)(
  "call readTimeEncoded(%j) === %j",
  (input, output) => {
    expect(readTimeEncoded(input)).toStrictEqual(output);
  },
);

type ToIntEncodedTest = [
  input: Parameters<typeof toIntEncoded>[0],
  output: Buffer,
];

const toIntEncodedTests: ToIntEncodedTest[] = [
  [0, Buffer.from([0x00])],
  [16, Buffer.from([0x10])],
  [250, Buffer.from([0xfa])],
  [null, Buffer.from([0xfb])],
  [255, Buffer.from([0xfc, 0xff, 0x00])],
  [0x20_10, Buffer.from([0xfc, 0x10, 0x20])],
  [0x30_20_10, Buffer.from([0xfd, 0x10, 0x20, 0x30])],
  [
    0xff_ff_ff + 1,
    Buffer.from([0xfe, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
  ],
  [
    0x80_70_60_50_40_30_20_10n,
    Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]),
  ],
];

test.each(toIntEncodedTests)(
  "call toIntEncoded(%s) === %s",
  (input, output) => {
    expect(toIntEncoded(input)).toStrictEqual(output);
  },
);

const bufferString1 = Buffer.from("a");
const bufferString250 = Buffer.allocUnsafe(250).fill("a");
const bufferString255 = Buffer.allocUnsafe(255).fill("b");

type ToStringEncodedTest = [input: Buffer | string | null, output: Buffer];

const toStringEncodedTests: ToStringEncodedTest[] = [
  [null, Buffer.from([0xfb])],
  ["", Buffer.from([0x00])],
  [Buffer.from("test"), Buffer.from("\u0004test")],
  [
    "\u004F\u006C\u00C3\u00A1\u002C\u0020\u006D\u0075\u006E\u0064\u006F\u0021",
    Buffer.concat([Buffer.from([0x0c]), Buffer.from("Olá, mundo!")]),
  ],
  [
    bufferString1.toString("binary"),
    Buffer.concat([Buffer.from([0x01]), bufferString1]),
  ],
  [
    bufferString250.toString("binary"),
    Buffer.concat([Buffer.from([0xfa]), bufferString250]),
  ],
  [
    bufferString255.toString("binary"),
    Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferString255]),
  ],
];

test.each(toStringEncodedTests)(
  "call toStringEncoded(%j) === %j",
  (input, output) => {
    expect(toStringEncoded(input)).toStrictEqual(output);
  },
);

test("call bufferXOR() between two Buffer's", () => {
  expect(
    bufferXOR(
      Buffer.from([0b1100_1111, 0b1111_1111, 0b1010_1010, 0b1111_0000]),
      Buffer.from([0b0011_1010, 0b0000_0000, 0b1010_1010, 0b1111_1111]),
    ),
  ).toStrictEqual(
    Buffer.from([0b1111_0101, 0b1111_1111, 0b0000_0000, 0b0000_1111]),
  );
});

test("call bufferXOR() between two Buffer's with different length must thrown", () => {
  expect(() => bufferXOR(Buffer.from([0x00]), Buffer.from([]))).toThrow(
    "both Buffer instances must have the same size",
  );
});

test("call createUInt16LE()", () => {
  expect(createUInt16LE(0x00_00)).toStrictEqual(Buffer.from([0x00, 0x00]));
  expect(createUInt16LE(0x10_20)).toStrictEqual(Buffer.from([0x20, 0x10]));
  expect(createUInt16LE(0xff_ff)).toStrictEqual(Buffer.from([0xff, 0xff]));
});

test("call createUInt32LE()", () => {
  expect(createUInt32LE(0x00_00_00)).toStrictEqual(
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  );
  expect(createUInt32LE(0x10_20_30_40)).toStrictEqual(
    Buffer.from([0x40, 0x30, 0x20, 0x10]),
  );
  expect(createUInt32LE(0xff_ff_ff_ff)).toStrictEqual(
    Buffer.from([0xff, 0xff, 0xff, 0xff]),
  );
});

type GetNullPositionTest = [
  nullBitmap: Buffer,
  fieldsCount: number,
  offset: number | undefined,
  output: number[],
];

const getNullPositionsTests: GetNullPositionTest[] = [
  [Buffer.from([0b0000_0000]), 1, undefined, []],
  [Buffer.from([0b0000_0001]), 1, undefined, [0]],
  [Buffer.from([0b0000_0011]), 1, undefined, [0]], // fake bit must be ignored
  [Buffer.from([0b0000_0000]), 2, undefined, []],
  [Buffer.from([0b0000_0010]), 2, undefined, [1]],
  [Buffer.from([0b0000_0001]), 2, undefined, [0]],
  [Buffer.from([0b0000_0011]), 2, undefined, [0, 1]],
  [Buffer.from([0b0000_0011]), 4, undefined, [0, 1]],
  [Buffer.from([0b0000_1100]), 4, undefined, [2, 3]],
  [Buffer.from([0b0011_0000]), 4, 2, [2, 3]], // First 2-bytes from right-side must be ignored.
  [Buffer.from([0b1111_1111]), 8, undefined, [0, 1, 2, 3, 4, 5, 6, 7]],
  [Buffer.from([0b0000_0000]), 8, undefined, []],
  [
    Buffer.from([0b1111_1111, 0b0000_0000]),
    16,
    undefined,
    [0, 1, 2, 3, 4, 5, 6, 7],
  ],
  [
    Buffer.from([0b1111_1111, 0b1111_1111]),
    16,
    undefined,
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  ],
  [
    Buffer.from([0b0101_0101, 0b0101_0101]),
    16,
    undefined,
    [0, 2, 4, 6, 8, 10, 12, 14],
  ],
  [Buffer.from([0b0101_0101, 0b0100_0001]), 9, undefined, [0, 2, 4, 6, 8]],
  [Buffer.from([0b0101_0101, 0b0000_0011]), 9, undefined, [0, 2, 4, 6, 8]], // fake bit must be ignored
  [
    Buffer.from([0b1111_0000, 0b1111_1111, 0b0000_0001]),
    15,
    2,
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  ],
  [
    Buffer.from([0b1110_1000, 0b1111_1111, 0b0000_0001]),
    15,
    2,
    [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  ],
  [
    Buffer.from([0b1111_0000, 0b1111_1111, 0b0000_0001]),
    16,
    2,
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  ],
  [
    Buffer.from([0b1110_1000, 0b1111_1111, 0b0000_0001]),
    16,
    2,
    [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  ],
];

test.each(getNullPositionsTests)(
  "call getNullPositions(%j, %j)",
  (nullBitmap, fieldsCount, offset, output) => {
    expect(
      getNullPositions(nullBitmap, fieldsCount, offset ?? 0),
    ).toStrictEqual(output);
  },
);

type NullBitmapTest = [input: unknown[], output: Buffer];

const nullBitmapsTests: NullBitmapTest[] = [
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

test.each(nullBitmapsTests)(
  "call generateNullBitmap(%j) === %j",
  (args, output) => {
    expect(generateNullBitmap(args)).toStrictEqual(output);
  },
);

type ChunkTest = [input: Buffer, size: number, output: Buffer[]];

const chunkTests: ChunkTest[] = [
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

test.each(chunkTests)("call chunk(%j, %j) === %j", (input, size, output) => {
  expect(chunk(input, size)).toStrictEqual(output);
});
