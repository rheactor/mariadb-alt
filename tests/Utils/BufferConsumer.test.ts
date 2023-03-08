import { BufferConsumer } from "@/Utils/BufferConsumer";
import { InitialHandshakePacketFixture } from "@Tests/Fixtures/InitialHandshakePacket";

describe("BufferConsumer", () => {
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

  test("skip()", () => {
    const bufferConsumer = new BufferConsumer(Buffer.from("00123"));

    bufferConsumer.skip(2);

    expect(bufferConsumer.readString(3)).toStrictEqual(Buffer.from("123"));
  });

  test("all", () => {
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
});
