import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { BufferConsumer } from "@/Utils/BufferConsumer";

type ConnectionOptionsHandshake = Parameters<typeof createHandshakeResponse>[2];

test("createHandshakeResponse() without password", () => {
  const options: ConnectionOptionsHandshake = {
    user: "root",
    password: "",
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

  handshake.skip(4);
  expect(handshake.readUInt(4)).toBe(0x00_00_00_ff);
  handshake.skip(24);
  expect(handshake.readNullTerminatedString().toString("binary")).toBe("root");
  expect(handshake.readUInt()).toBe(0);
  expect(handshake.readNullTerminatedString().toString("binary")).toBe("test");
  expect(handshake.readNullTerminatedString().toString("binary")).toBe(
    "example",
  );
});
