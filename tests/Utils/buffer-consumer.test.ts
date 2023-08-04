import { initialHandshakePacketSamples } from "@Tests/Fixtures/samples";

import { BufferConsumer } from "@/Utils/BufferConsumer";

test("readUInt()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from(
      "\u0010\u0020\u0030\u0040\u0050\u0060\u0000\u00FF\u00FF\u0070\u0080\u0090",
      "binary",
    ),
  );

  expect(bufferConsumer.readUInt()).toBe(0x10);
  expect(bufferConsumer.readUInt()).toBe(0x20);
  expect(bufferConsumer.readUInt(2)).toBe(0x40_30);
  expect(bufferConsumer.readUInt(2)).toBe(0x60_50);
  expect(bufferConsumer.readUInt()).toBe(0x00);
  expect(bufferConsumer.readUInt(2)).toBe(0xff_ff);
  expect(bufferConsumer.readUInt(3)).toBe(0x90_80_70);
});

test("readInt()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from("\u0080\u00FF", "binary"),
  );

  expect(bufferConsumer.readInt()).toBe(-128);
  expect(bufferConsumer.readInt()).toBe(-1);
});

test("readUBigInt()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from(
      "\u0010\u0020\u0030\u0040\u0050\u0060\u0070\u0080\u0080\u0070\u0060\u0050\u0040\u0030\u0020\u0010",
      "binary",
    ),
  );

  expect(bufferConsumer.readUBigInt()).toBe(9_255_003_132_036_915_216n);
  expect(bufferConsumer.readUBigInt()).toBe(1_161_981_756_646_125_696n);
});

test("readUInt()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from(
      "\u0010\u0020\u0030\u0040\u0050\u0060\u0070\u0080\u0080\u0070\u0060\u0050\u0040\u0030\u0020\u0010",
      "binary",
    ),
  );

  expect(bufferConsumer.readBigInt()).toBe(-9_191_740_941_672_636_400n);
  expect(bufferConsumer.readBigInt()).toBe(1_161_981_756_646_125_696n);
});

test("readIntEncoded()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from([
      // 1-byte int(0)
      0x00,
      // 1-byte int(16)
      0x10,
      // 1-byte int(250) -- max 1-byte possibility
      0xfa,
      // NULL
      0xfb,
      // 2-bytes int(0)
      0xfc, 0x00, 0x00,
      // 2-bytes int(0x2010)
      0xfc, 0x10, 0x20,
      // 3-bytes int(0)
      0xfd, 0x00, 0x00, 0x00,
      // 3-bytes int(0x302010)
      0xfd, 0x10, 0x20, 0x30,
      // 8-bytes int(0)
      0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // 8-bytes bigint(0x80706050_40302010)
      0xfe, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
    ]),
  );

  expect(bufferConsumer.readIntEncoded()).toBe(0);
  expect(bufferConsumer.readIntEncoded()).toBe(16);
  expect(bufferConsumer.readIntEncoded()).toBe(250);
  expect(bufferConsumer.readIntEncoded()).toBeNull();
  expect(bufferConsumer.readIntEncoded()).toBe(0);
  expect(bufferConsumer.readIntEncoded()).toBe(0x20_10);
  expect(bufferConsumer.readIntEncoded()).toBe(0);
  expect(bufferConsumer.readIntEncoded()).toBe(0x30_20_10);
  expect(bufferConsumer.readIntEncoded()).toBe(0n);

  const bufferBigInt = bufferConsumer.readIntEncoded() as bigint;

  expect(typeof bufferBigInt).toBe("bigint");
  expect(bufferBigInt.toString(16)).toBe("8070605040302010");
});

test("readBoolean()", () => {
  const bufferConsumer = new BufferConsumer(Buffer.from("\u0000\u0001"));

  expect(bufferConsumer.readBoolean()).toBe(false);
  expect(bufferConsumer.readBoolean()).toBe(true);
});

test("readNullTerminatedString()", () => {
  const bufferConsumer = new BufferConsumer(Buffer.from("AA\0BB\0"));

  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("AA"),
  );
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("BB"),
  );
});

test("readString()", () => {
  const bufferConsumer = new BufferConsumer(Buffer.from("Test123\u0000456"));

  expect(bufferConsumer.readString(4)).toStrictEqual(Buffer.from("Test"));
  expect(bufferConsumer.readString(3, true)).toStrictEqual(Buffer.from("123"));
  expect(bufferConsumer.readString(3)).toStrictEqual(Buffer.from("456"));
});

test("readStringEncoded()", () => {
  const bufferString1 = Buffer.from("a");
  const bufferString250 = Buffer.allocUnsafe(250).fill("a");
  const bufferString255 = Buffer.allocUnsafe(255).fill("b");
  const bufferString400 = Buffer.allocUnsafe(400).fill("c");
  const bufferString100K = Buffer.allocUnsafe(100_000).fill("d");
  const bufferString16M1 = Buffer.allocUnsafe(0xff_ff_ff + 1).fill("e");

  const bufferConsumer = new BufferConsumer(
    Buffer.concat([
      // string("")
      Buffer.from([0x00]),
      // NULL
      Buffer.from([0xfb]),
      // string(1 character), 1-byte int encoded
      Buffer.concat([Buffer.from([0x01]), bufferString1]),
      // string(250 characters), 1-byte int encoded
      Buffer.concat([Buffer.from([0xfa]), bufferString250]),
      // string(255 characters), 2-bytes int encoded
      Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferString255]),
      // string(400 characters), 3-bytes int encoded
      Buffer.concat([Buffer.from([0xfd, 0x90, 0x01, 0x00]), bufferString400]),
      // string(100K characters), 3-bytes int encoded
      Buffer.concat([Buffer.from([0xfd, 0xa0, 0x86, 0x01]), bufferString100K]),
      // string(16M+1 characters), 8-bytes int encoded
      Buffer.concat([
        Buffer.from([0xfe, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x01]),
        bufferString16M1,
      ]),
    ]),
  );

  expect(bufferConsumer.readStringEncoded()).toStrictEqual(Buffer.from(""));
  expect(bufferConsumer.readStringEncoded()).toBeNull();
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString1.length,
  );
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString250.length,
  );
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString255.length,
  );
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString400.length,
  );
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString100K.length,
  );
  expect(bufferConsumer.readStringEncoded()!).toHaveLength(
    bufferString16M1.length,
  );
});

test("slice()", () => {
  expect(
    new BufferConsumer(Buffer.from("0012300")).skip(2).slice(3),
  ).toStrictEqual(Buffer.from("123"));
});

test("skip()", () => {
  expect(
    new BufferConsumer(Buffer.from("00123")).skip(2).readString(3),
  ).toStrictEqual(Buffer.from("123"));
});

test("consumed()", () => {
  expect(new BufferConsumer(Buffer.from("123")).skip(2).consumed()).toBe(false);

  expect(new BufferConsumer(Buffer.from("123")).skip(3).consumed()).toBe(true);
});

test("at()", () => {
  const bufferConsumer = new BufferConsumer(Buffer.from("123"));

  expect(bufferConsumer.at()).toBe(49);
  expect(bufferConsumer.at(1)).toBe(50);
});

test("skipStringEncoded()", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from([0x00, 0xfb, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]),
  );

  expect(
    bufferConsumer.skipStringEncoded().skipStringEncoded().readStringEncoded(),
  ).toStrictEqual(Buffer.from("Hello"));
});

test("multiples", () => {
  const bufferConsumer = new BufferConsumer(
    Buffer.from(
      "\u0010\u0020\u0030\u0040\u0050\u0060Test\0\u0000123",
      "binary",
    ),
  );

  expect(bufferConsumer.readUInt()).toBe(0x10);
  expect(bufferConsumer.readUInt(2)).toBe(0x30_20);
  expect(bufferConsumer.readUInt(3)).toBe(0x60_50_40);
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("Test"),
  );

  bufferConsumer.skip();

  expect(bufferConsumer.readString(3)).toStrictEqual(Buffer.from("123"));
});

test("initial handshake packet example", () => {
  const bufferConsumer = new BufferConsumer(
    initialHandshakePacketSamples.sampleA,
  );

  expect(bufferConsumer.readUInt()).toBe(0x0a);
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("example"),
  );
  expect(bufferConsumer.readUInt(4)).toBe(0x40_30_20_10);
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("Scramble"),
  );
  expect(bufferConsumer.readUInt(2)).toBe(0xf7_fe);
  expect(bufferConsumer.readUInt()).toBe(0x2d);
  expect(bufferConsumer.readUInt(2)).toBe(0x00_02);
  expect(bufferConsumer.readUInt(2)).toBe(0x81_ff);
  expect(bufferConsumer.readUInt()).toBe(0x15);
  bufferConsumer.skip(6);
  expect(bufferConsumer.readUInt(4)).toBe(0x00_00_00_1d);
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("Scramble1234"),
  );
  expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
    Buffer.from("mysql_native_password"),
  );
});
