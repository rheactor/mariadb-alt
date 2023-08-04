import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { BufferConsumer } from "@/Utils/BufferConsumer";

type ConnectionOptionsHandshake = Parameters<typeof createHandshakeResponse>[2];

test("createHandshakeResponse() with password", () => {
  const options: ConnectionOptionsHandshake = {
    user: "root",
    password: "password",
    database: "test",
  };

  const handshake = new BufferConsumer(
    createHandshakeResponse(
      Buffer.from([0]),
      Buffer.from("example"),
      options,
      0x00_00_00_ff,
    ),
  );

  handshake.skip(32);
  expect(handshake.readNullTerminatedString().toString("binary")).toBe("root");

  expect(handshake.readStringEncoded()).toStrictEqual(
    Buffer.from([
      0x3e, 0x46, 0xbc, 0x91, 0x3f, 0xf4, 0x78, 0xc3, 0xc5, 0x69, 0xea, 0x40,
      0xd2, 0x92, 0x97, 0x4e, 0xa6, 0x54, 0x9c, 0x44,
    ]),
  );
  expect(handshake.readNullTerminatedString().toString("binary")).toBe("test");
  expect(handshake.readNullTerminatedString().toString("binary")).toBe(
    "example",
  );
});
