import { expect, test } from "vitest";

import { PacketOk } from "@/Protocol/Packet/PacketOk";

type Test = [buffer: number[], isOk: boolean, isEOF: boolean];

const tests: Test[] = [
  // A OK Packet #1.
  [
    Buffer.from([0x00, 0x00, 0x00, 0x10, 0x20, 0x30, 0x40]).toJSON().data,
    true,
    false,
  ],

  // A OK Packet #2.
  [
    Buffer.from([0x00, 0xfc, 0x10, 0x20, 0x00, 0x10, 0x20, 0x30, 0x40]).toJSON()
      .data,
    true,
    false,
  ],

  // A EOF Packet.
  [Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40]).toJSON().data, true, true],

  // Invalid packet.
  [Buffer.from([0x00]).toJSON().data, false, false],
];

test.each(tests)("call PacketOk.is(%j) === %j", (packet, isOKUnit) => {
  expect(PacketOk.is(Buffer.from(packet))).toBe(isOKUnit);
});

test.each(tests.map(([packet, , isEOFUnit]) => [packet, isEOFUnit]))(
  "call PacketOk.isEOF(%j) === %j",
  (packet, isEOFUnit) => {
    expect(PacketOk.isEOF(Buffer.from(packet))).toBe(isEOFUnit);
  },
);
