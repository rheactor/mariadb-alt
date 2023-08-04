import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import {
  PacketReassembler,
  type PacketType,
} from "@/Protocol/PacketReassembler/PacketReassembler";
import { ReassemblerResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet";

type Test = [
  buffers: number[][],
  okPackets: PacketType[],
  errorPacket: PacketError | undefined,
];

const tests: Test[] = [
  // PacketOK.
  [
    [
      Buffer.from([
        // Length: 7 bytes. Sequence: 0.
        0x07, 0x00, 0x00, 0x00,
        // Packet OK identifier.
        0x00,
        // Affected rows: 0x10, Last insert id: 0x20.
        0x10, 0x20,
        // Status flags: 0x4030, Number of warnings: 0x6050.
        0x30, 0x40, 0x50, 0x60,
      ]).toJSON().data,
    ],
    [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]))],
    undefined,
  ],

  // PacketOK (splitted).
  [
    [
      Buffer.from([
        // Length: 7 bytes.
        0x07, 0x00, 0x00,
      ]).toJSON().data,
      Buffer.from([
        // Sequence: 0.
        0x00,
        // Packet OK identifier.
        0x00,
        // Affected rows: 0x10, Last Insert ID: 0x20.
        0x10, 0x20,
        // Status flags: 0x4030, Number of warnings: 0x6050.
        0x30, 0x40, 0x50, 0x60,
      ]).toJSON().data,
    ],
    [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]))],
    undefined,
  ],

  // PacketOK (from EOF Buffer).
  [
    [
      Buffer.from([0x05, 0x00, 0x00, 0x00]).toJSON().data,
      Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40]).toJSON().data,
    ],
    [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40]))],
    undefined,
  ],

  // PacketError.
  [
    [
      // Length: 16 bytes.
      Buffer.from([0x10, 0x00, 0x00, 0x00]).toJSON().data,
      // Error packet identifier.
      Buffer.from([0xff]).toJSON().data,
      // Error state code:
      Buffer.from([0x10, 0x20]).toJSON().data,
      // Error marker (#), error code (ER123), error message.
      Buffer.from("#ER123Message").toJSON().data,
    ],
    [],
    PacketError.from(Buffer.from("\u0010\u0020#ER123Message", "binary")),
  ],

  // PacketError, but with 2 packets PacketOk before.
  [
    [
      // PacketOK #1 (with ServerStatus.MORE_RESULTS)
      Buffer.from([
        // Length: 7 bytes. Sequence: 0.
        0x07, 0x00, 0x00, 0x00,
        // Packet OK identifier.
        0x00,
        // Affected rows: 0x10, Last insert id: 0x20.
        0x10, 0x20,
        // Status flags: 0x000a, Number of warnings: 0x6050.
        0x0a, 0x00, 0x50, 0x60,
      ]).toJSON().data,
      // PacketOK #2 (with ServerStatus.MORE_RESULTS)
      Buffer.from([
        // Length: 7 bytes. Sequence: 0.
        0x07, 0x00, 0x00, 0x00,
        // Packet OK identifier.
        0x00,
        // Affected rows: 0x10, Last insert id: 0x20.
        0x10, 0x20,
        // Status flags: 0x4030, Number of warnings: 0x6050.
        0x0a, 0x00, 0x50, 0x60,
      ]).toJSON().data,
      // Packet Error
      // Length: 16 bytes.
      Buffer.from([0x10, 0x00, 0x00, 0x00]).toJSON().data,
      // Error packet identifier.
      Buffer.from([0xff]).toJSON().data,
      // Error state code:
      Buffer.from([0x10, 0x20]).toJSON().data,
      // Error marker (#), error code (ER123), error message.
      Buffer.from("#ER123Message").toJSON().data,
    ],
    [
      PacketOk.from(Buffer.from([0x10, 0x20, 0x0a, 0x00, 0x50, 0x60])),
      PacketOk.from(Buffer.from([0x10, 0x20, 0x0a, 0x00, 0x50, 0x60])),
    ],
    PacketError.from(Buffer.from("\u0010\u0020#ER123Message", "binary")),
  ],

  // PacketResultSet: SELECT "".
  [
    [
      // Header:
      // Column count: 1 field.
      Buffer.from([0x01, 0x00, 0x00, 0x01]).toJSON().data,
      Buffer.from([0x01]).toJSON().data,

      // Field #1:
      // Field packet header:
      Buffer.from([0x16, 0x00, 0x00, 0x02]).toJSON().data,
      // Catalog "def":
      Buffer.from([0x03, 0x64, 0x65, 0x66]).toJSON().data,
      // Database, table, original table, column, column alias: empty.
      Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]).toJSON().data,
      // Unused:
      Buffer.from([0x0c]).toJSON().data,
      // Collation: utf8mb4_general_ci.
      Buffer.from([0x2d, 0x00]).toJSON().data,
      // Length: 0.
      Buffer.from([0x00, 0x00, 0x00, 0x00]).toJSON().data,
      // Type: VARCHAR.
      Buffer.from([0xfd]).toJSON().data,
      // Flags: NOT NULL.
      Buffer.from([0x01, 0x00]).toJSON().data,
      // Decimals: 39.
      Buffer.from([0x27]).toJSON().data,
      // Unused:
      Buffer.from([0x00, 0x00]).toJSON().data,

      // Intermediate EOF:
      Buffer.from([0x05, 0x00, 0x00, 0x03]).toJSON().data,
      Buffer.from([0xfe, 0x00, 0x00, 0x02, 0x00]).toJSON().data,

      // Row #1:
      // Row packet header:
      Buffer.from([0x01, 0x00, 0x00, 0x04]).toJSON().data,
      // Row Field#1 value: "".
      Buffer.from([0x00]).toJSON().data,

      // Final EOF:
      Buffer.from([0x05, 0x00, 0x00, 0x05]).toJSON().data,
      Buffer.from([0xfe, 0x00, 0x00, 0x02, 0x00]).toJSON().data,
    ],
    [
      new PacketResultSet(
        Buffer.concat([
          Buffer.from([0x01]),
          //
          Buffer.from([0x03, 0x64, 0x65, 0x66]),
          Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]),
          Buffer.from([0x0c]),
          Buffer.from([0x2d, 0x00]),
          Buffer.from([0x00, 0x00, 0x00, 0x00]),
          Buffer.from([0xfd]),
          Buffer.from([0x01, 0x00]),
          Buffer.from([0x27]),
          Buffer.from([0x00, 0x00]),
          //
          Buffer.from([0x00]),
        ]),
      ),
    ],
    undefined,
  ],

  // PacketResultSet: SELECT "" (at once).
  [
    [
      Buffer.from([
        // Column count: 1 field.
        0x01, 0x00, 0x00, 0x01, 0x01,

        // Field #1:
        // Field packet header:
        0x16, 0x00, 0x00, 0x02,
        // Catalog "def":
        0x03, 0x64, 0x65, 0x66,
        // Database, table, original table, column, column alias: empty.
        0x00, 0x00, 0x00, 0x00, 0x00,
        // Unused:
        0x0c,
        // Collation: utf8mb4_general_ci.
        0x2d, 0x00,
        // Length: 0.
        0x00, 0x00, 0x00, 0x00,
        // Type: VARCHAR.
        0xfd,
        // Flags: NOT NULL.
        0x01, 0x00,
        // Decimals: 39.
        0x27,
        // Unused:
        0x00, 0x00,

        // Intermediate EOF:
        0x05, 0x00, 0x00, 0x03, 0xfe, 0x00, 0x00, 0x02, 0x00,

        // Row #1:
        // Row packet header:
        0x01, 0x00, 0x00, 0x04,
        // Row Field#1 value: "".
        0x00,

        // Final EOF:
        0x05, 0x00, 0x00, 0x05, 0xfe, 0x00, 0x00, 0x02, 0x00,
      ]).toJSON().data,
    ],
    [
      new PacketResultSet(
        Buffer.concat([
          Buffer.from([0x01]),
          //
          Buffer.from([0x03, 0x64, 0x65, 0x66]),
          Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]),
          Buffer.from([0x0c]),
          Buffer.from([0x2d, 0x00]),
          Buffer.from([0x00, 0x00, 0x00, 0x00]),
          Buffer.from([0xfd]),
          Buffer.from([0x01, 0x00]),
          Buffer.from([0x27]),
          Buffer.from([0x00, 0x00]),
          //
          Buffer.from([0x00]),
        ]),
      ),
    ],
    undefined,
  ],
];

test.each(tests)(
  "new PacketReassembler() with buffers %j",
  (buffers, expectedPackets, expectedError) => {
    expect.assertions(2);

    const reassembler = new PacketReassembler((packets, error) => {
      expect(packets).toStrictEqual(expectedPackets);
      expect(error).toStrictEqual(expectedError);
    }, ReassemblerResultSet);

    for (const buffer of buffers) {
      reassembler.push(Buffer.from(buffer));
    }
  },
);
