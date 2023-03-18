import { BufferConsumer } from "@/Utils/BufferConsumer";
import { InitialHandshakePacketFixture } from "@Tests/Fixtures/InitialHandshakePacket";

describe("Utils/BufferConsumer", () => {
  test("readInt()", () => {
    const bufferConsumer = new BufferConsumer(
      Buffer.from("\x10\x20\x30\x40\x50\x60\x00\xFF\xFF\x70\x80\x90", "binary")
    );

    expect(bufferConsumer.readInt()).toBe(0x10);
    expect(bufferConsumer.readInt()).toBe(0x20);
    expect(bufferConsumer.readInt(2)).toBe(0x4030);
    expect(bufferConsumer.readInt(2)).toBe(0x6050);
    expect(bufferConsumer.readInt()).toBe(0x00);
    expect(bufferConsumer.readInt(2)).toBe(0xffff);
    expect(bufferConsumer.readInt(3)).toBe(0x908070);
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
      ])
    );

    expect(bufferConsumer.readIntEncoded()).toBe(0);
    expect(bufferConsumer.readIntEncoded()).toBe(16);
    expect(bufferConsumer.readIntEncoded()).toBe(250);
    expect(bufferConsumer.readIntEncoded()).toBe(null);
    expect(bufferConsumer.readIntEncoded()).toBe(0);
    expect(bufferConsumer.readIntEncoded()).toBe(0x2010);
    expect(bufferConsumer.readIntEncoded()).toBe(0);
    expect(bufferConsumer.readIntEncoded()).toBe(0x302010);
    expect(bufferConsumer.readIntEncoded()).toBe(0n);

    const bufferBigInt = bufferConsumer.readIntEncoded() as bigint;

    expect(typeof bufferBigInt).toBe("bigint");
    expect(bufferBigInt.toString(16)).toBe("8070605040302010");
  });

  test("readNullTerminatedString()", () => {
    const bufferConsumer = new BufferConsumer(Buffer.from("AA\0BB\0"));

    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("AA")
    );
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("BB")
    );
  });

  test("readString()", () => {
    const bufferConsumer = new BufferConsumer(Buffer.from("Test123\x00456"));

    expect(bufferConsumer.readString(4)).toStrictEqual(Buffer.from("Test"));
    expect(bufferConsumer.readString(3, true)).toStrictEqual(
      Buffer.from("123")
    );
    expect(bufferConsumer.readString(3)).toStrictEqual(Buffer.from("456"));
  });

  test("readStringEncoded()", () => {
    const bufferStr1 = Buffer.from("a");
    const bufferStr250 = Buffer.allocUnsafe(250).fill("a");
    const bufferStr255 = Buffer.allocUnsafe(255).fill("b");
    const bufferStr400 = Buffer.allocUnsafe(400).fill("c");
    const bufferStr100K = Buffer.allocUnsafe(100000).fill("d");
    const bufferStr16M1 = Buffer.allocUnsafe(0xffffff + 1).fill("e");

    const bufferConsumer = new BufferConsumer(
      Buffer.concat([
        // string("")
        Buffer.from([0x00]),
        // NULL
        Buffer.from([0xfb]),
        // string(1 character), 1-byte int encoded
        Buffer.concat([Buffer.from([0x01]), bufferStr1]),
        // string(250 characters), 1-byte int encoded
        Buffer.concat([Buffer.from([0xfa]), bufferStr250]),
        // string(255 characters), 2-bytes int encoded
        Buffer.concat([Buffer.from([0xfc, 0xff, 0x00]), bufferStr255]),
        // string(400 characters), 3-bytes int encoded
        Buffer.concat([Buffer.from([0xfd, 0x90, 0x01, 0x00]), bufferStr400]),
        // string(100K characters), 3-bytes int encoded
        Buffer.concat([Buffer.from([0xfd, 0xa0, 0x86, 0x01]), bufferStr100K]),
        // string(16M+1 characters), 8-bytes int encoded
        Buffer.concat([
          Buffer.from([0xfe, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x01]),
          bufferStr16M1,
        ]),
      ])
    );

    expect(bufferConsumer.readStringEncoded()).toStrictEqual(Buffer.from(""));
    expect(bufferConsumer.readStringEncoded()).toStrictEqual(null);
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr1.length
    );
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr250.length
    );
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr255.length
    );
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr400.length
    );
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr100K.length
    );
    expect(bufferConsumer.readStringEncoded()!.length).toStrictEqual(
      bufferStr16M1.length
    );
  });

  test("skip()", () => {
    expect(
      new BufferConsumer(Buffer.from("00123")).skip(2).readString(3)
    ).toStrictEqual(Buffer.from("123"));
  });

  test("at()", () => {
    expect(new BufferConsumer(Buffer.from("123")).at(1)).toBe(50);
  });

  test("multiples", () => {
    const bufferConsumer = new BufferConsumer(
      Buffer.from("\x10\x20\x30\x40\x50\x60Test\0\x00123", "binary")
    );

    expect(bufferConsumer.readInt()).toBe(0x10);
    expect(bufferConsumer.readInt(2)).toBe(0x3020);
    expect(bufferConsumer.readInt(3)).toBe(0x605040);
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("Test")
    );

    bufferConsumer.skip();

    expect(bufferConsumer.readString(3)).toStrictEqual(Buffer.from("123"));
  });

  test("initial handshake packet example", () => {
    const bufferConsumer = new BufferConsumer(
      InitialHandshakePacketFixture.Example1
    );

    expect(bufferConsumer.readInt()).toBe(0x0a);
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("example")
    );
    expect(bufferConsumer.readInt(4)).toBe(0x40302010);
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("Scramble")
    );
    expect(bufferConsumer.readInt(2)).toBe(0xf7fe);
    expect(bufferConsumer.readInt()).toBe(0x2d);
    expect(bufferConsumer.readInt(2)).toBe(0x0002);
    expect(bufferConsumer.readInt(2)).toBe(0x81ff);
    expect(bufferConsumer.readInt()).toBe(0x15);
    bufferConsumer.skip(6);
    expect(bufferConsumer.readInt(4)).toBe(0x0000001d);
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("Scramble1234")
    );
    expect(bufferConsumer.readNullTerminatedString()).toStrictEqual(
      Buffer.from("mysql_native_password")
    );
  });

  test("rest()", () => {
    const bufferConsumer = new BufferConsumer(Buffer.from("0123"), 1);

    expect(bufferConsumer.rest()).toStrictEqual(Buffer.from("123"));
    expect(bufferConsumer.rest(1)).toStrictEqual(Buffer.from("23"));
    expect(bufferConsumer.rest(-1)).toStrictEqual(Buffer.from("0123"));
  });
});
