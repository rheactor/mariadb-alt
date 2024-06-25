import { expect, test } from "vitest";

import { PacketOk } from "@/Protocol/Packet/PacketOk.js";

type Test = [
  buffer: number[],
  affectedRows: bigint | number,
  lastInsertId: bigint | number,
  serverStatus: number,
  warningCount: number,
];

const tests: Test[] = [
  // A literal OK Packet.
  [
    Buffer.concat([
      Buffer.from([0x00]),
      Buffer.from([0x00]),
      Buffer.from([0x10, 0x20]),
      Buffer.from([0x30, 0x40]),
    ]).toJSON().data,
    0x00,
    0x00,
    0x20_10,
    0x40_30,
  ],

  // An EOF Packet transformed into an OK Packet.
  [
    Buffer.concat([
      Buffer.from([0x10, 0x20]),
      Buffer.from([0x30, 0x40]),
    ]).toJSON().data,
    0x00,
    0x00,
    0x40_30,
    0x20_10,
  ],
];

test.each(tests)(
  "call PacketOk.from(%j) === { affectedRows: %j, lastInsertId: %j, warningCount: %j, serverStatus: %j }",
  (buffer, affectedRows, lastInsertId, serverStatus, warningCount) => {
    const packetOk = PacketOk.from(Buffer.from(buffer));

    expect(packetOk.affectedRows).toBe(affectedRows);
    expect(packetOk.lastInsertId).toBe(lastInsertId);
    expect(packetOk.warningCount).toBe(warningCount);
    expect(packetOk.serverStatus).toBe(serverStatus);
  },
);
