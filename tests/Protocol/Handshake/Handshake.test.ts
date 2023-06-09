import { Handshake } from "@/Protocol/Handshake/Handshake";
import { InitialHandshakePacketFixture } from "@Tests/Fixtures/InitialHandshakePacket";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  test("read properties", () => {
    const packet = new Handshake(InitialHandshakePacketFixture.Example1);

    expect(packet.protocolVersion).toBe(0x0a);
    expect(packet.serverVersion).toStrictEqual(Buffer.from("example"));
    expect(packet.connectionId).toBe(0x40302010);
    expect(packet.authSeed).toStrictEqual(Buffer.from("ScrambleScramble1234"));
    expect(packet.capabilities.toString(16)).toBe("1d81fff7fe");
    expect(packet.defaultCollation).toBe(0x2d);
    expect(packet.serverStatus).toBe(0x0002);
    expect(packet.authPluginNameLength).toBe(0x15);
    expect(packet.authPluginName).toStrictEqual(
      Buffer.from("mysql_native_password")
    );
  });
});
