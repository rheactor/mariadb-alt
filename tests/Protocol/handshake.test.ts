import { initialHandshakePacketSamples } from "@Tests/Fixtures/samples";
import { expect, test } from "vitest";

import { Handshake } from "@/Protocol/Handshake/Handshake";

test('new Handshake with sample "A"', () => {
  const packet = new Handshake(initialHandshakePacketSamples.sampleA);

  expect(packet.protocolVersion).toBe(0x0a);
  expect(packet.serverVersion).toStrictEqual(Buffer.from("example"));
  expect(packet.connectionId).toBe(0x40_30_20_10);
  expect(packet.authSeed).toStrictEqual(Buffer.from("ScrambleScramble1234"));
  expect(packet.capabilities.toString(16)).toBe("1d81fff7fe");
  expect(packet.defaultCollation).toBe(0x2d);
  expect(packet.serverStatus).toBe(0x00_02);
  expect(packet.authPluginNameLength).toBe(0x15);
  expect(packet.authPluginName).toStrictEqual(
    Buffer.from("mysql_native_password"),
  );
});
