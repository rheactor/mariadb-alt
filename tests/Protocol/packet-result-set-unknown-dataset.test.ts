import { expect, test } from "vitest";

import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";

test('call PacketResultSet.transform("") === unknown metadata', () => {
  expect(
    PacketResultSet.transform(
      [Buffer.from("")],
      [
        {
          type: -1,
          name: "unknown",
          collation: -1,
          flags: -1,
          length: -1,
          decimals: -1,
          json: false,
          uuid: false,
        },
      ],
    ),
  ).toStrictEqual({});
});

test("new PacketResultSet() with unknown data type", () => {
  const packetResultSet = new PacketResultSet(
    Buffer.from([
      // Fields count: 1.
      0x01,
      // Field #1 catalog, database, table alias, table: empty.
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Field #1 column name alias: "unknown".
      0x07, 0x75, 0x6e, 0x6b, 0x6e, 0x6f, 0x77, 0x6e,
      // Field #1 column name: empty.
      0x00,
      // Field extended metadata length: 8.
      0x08,
      // Field extended metadata #1 type: 0 (mean "format").
      0x00,
      // Field extended metadata #1 value: "unknown".
      0x75, 0x6e, 0x6b, 0x6e, 0x6f, 0x77, 0x6e,
      // Length of fixed fields: always 0x0C.
      0x0c,
      // Collation: just ignore.
      0x00, 0x00,
      // Max column size: just ignore.
      0x00, 0x00, 0x00, 0x00,
      // Field type: just ignore.
      0x00,
      // Field detail flag: just ignore.
      0x00, 0x00,
      // Field decimals: just ignore.
      0x00,
      // Unused.
      0x00, 0x00,
    ]),
  );

  expect(packetResultSet.getFields()).toStrictEqual([
    {
      type: 0,
      name: "unknown",
      collation: 0,
      flags: 0,
      length: 0,
      decimals: 0,
      json: false,
      uuid: false,
    },
  ]);
});
