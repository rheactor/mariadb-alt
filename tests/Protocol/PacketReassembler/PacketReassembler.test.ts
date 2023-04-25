import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import {
  PacketReassembler,
  type PacketType,
} from "@/Protocol/PacketReassembler/PacketReassembler";
import { ReassemblerResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type PacketUnit = [string, Buffer[], PacketType[], PacketError?];

  const packetsUnits: PacketUnit[] = [
    [
      "PacketOK",
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
        ]),
      ],
      [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]))],
    ],
    [
      "PacketOK (splitted)",
      [
        Buffer.from([
          // Length: 7 bytes.
          0x07, 0x00, 0x00,
        ]),
        Buffer.from([
          // Sequence: 0.
          0x00,
          // Packet OK identifier.
          0x00,
          // Affected rows: 0x10, Last Insert ID: 0x20.
          0x10, 0x20,
          // Status flags: 0x4030, Number of warnings: 0x6050.
          0x30, 0x40, 0x50, 0x60,
        ]),
      ],
      [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]))],
    ],
    [
      "PacketOK (from EOF Buffer)",
      [
        Buffer.from([0x05, 0x00, 0x00, 0x00]),
        Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40]),
      ],
      [PacketOk.from(Buffer.from([0x10, 0x20, 0x30, 0x40]))],
    ],
    [
      "PacketError",
      [
        // Length: 16 bytes.
        Buffer.from([0x10, 0x00, 0x00, 0x00]),
        // Error packet identifier.
        Buffer.from([0xff]),
        // Error state code:
        Buffer.from([0x10, 0x20]),
        // Error marker (#), error code (ER123), error message.
        Buffer.from("#ER123Message"),
      ],
      [],
      PacketError.from(Buffer.from("\x10\x20#ER123Message", "binary")),
    ],
    [
      "PacketError, but with 2 packets PacketOk before",
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
        ]),
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
        ]),
        // Packet Error
        // Length: 16 bytes.
        Buffer.from([0x10, 0x00, 0x00, 0x00]),
        // Error packet identifier.
        Buffer.from([0xff]),
        // Error state code:
        Buffer.from([0x10, 0x20]),
        // Error marker (#), error code (ER123), error message.
        Buffer.from("#ER123Message"),
      ],
      [
        PacketOk.from(Buffer.from([0x10, 0x20, 0x0a, 0x00, 0x50, 0x60])),
        PacketOk.from(Buffer.from([0x10, 0x20, 0x0a, 0x00, 0x50, 0x60])),
      ],
      PacketError.from(Buffer.from("\x10\x20#ER123Message", "binary")),
    ],
    [
      'PacketResultSet: SELECT ""',
      [
        // Header:
        // Column count: 1 field.
        Buffer.from([0x01, 0x00, 0x00, 0x01]),
        Buffer.from([0x01]),

        // Field #1:
        // Field packet header:
        Buffer.from([0x16, 0x00, 0x00, 0x02]),
        // Catalog "def":
        Buffer.from([0x03, 0x64, 0x65, 0x66]),
        // Database, table, original table, column, column alias: empty.
        Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]),
        // Unused:
        Buffer.from([0x0c]),
        // Collation: utf8mb4_general_ci.
        Buffer.from([0x2d, 0x00]),
        // Length: 0.
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        // Type: VARCHAR.
        Buffer.from([0xfd]),
        // Flags: NOT NULL.
        Buffer.from([0x01, 0x00]),
        // Decimals: 39.
        Buffer.from([0x27]),
        // Unused:
        Buffer.from([0x00, 0x00]),

        // Intermediate EOF:
        Buffer.from([0x05, 0x00, 0x00, 0x03]),
        Buffer.from([0xfe, 0x00, 0x00, 0x02, 0x00]),

        // Row #1:
        // Row packet header:
        Buffer.from([0x01, 0x00, 0x00, 0x04]),
        // Row Field#1 value: "".
        Buffer.from([0x00]),

        // Final EOF:
        Buffer.from([0x05, 0x00, 0x00, 0x05]),
        Buffer.from([0xfe, 0x00, 0x00, 0x02, 0x00]),
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
          ])
        ),
      ],
    ],
    [
      'PacketResultSet: SELECT "" (at once)',
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
        ]),
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
          ])
        ),
      ],
    ],
  ];

  describe.each(packetsUnits)(
    "PacketReassembler()",
    (name, buffers, expectedPackets, expectedError) => {
      test(name, () => {
        expect.assertions(2);

        const reassembler = new PacketReassembler((packets, error) => {
          expect(packets).toStrictEqual(expectedPackets);
          expect(error).toStrictEqual(expectedError);
        }, ReassemblerResultSet);

        buffers.forEach((buffer) => reassembler.push(buffer));
      });
    }
  );

  describe("PacketReassembler()", () => {
    test("malformed packet", () => {
      const reassembler = new PacketReassembler(() => {
        // empty
      });

      expect(() =>
        reassembler.push(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01]))
      ).toThrowError("malformed packet");
    });
  });
});
