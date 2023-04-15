import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type UnitName = string;
  type Packet = Buffer;
  type OkAffectedRows = bigint | number;
  type OkLastInsertId = bigint | number;
  type OkServerStatus = number;
  type OkWarningCount = number;
  type FromUnit = [
    UnitName,
    Packet,
    OkAffectedRows,
    OkLastInsertId,
    OkServerStatus,
    OkWarningCount
  ];

  const fromUnits: FromUnit[] = [
    [
      "a literal OK Packet",
      Buffer.concat([
        Buffer.from([0x00]),
        Buffer.from([0x00]),
        Buffer.from([0x10, 0x20]),
        Buffer.from([0x30, 0x40]),
      ]),
      0x00,
      0x00,
      0x2010,
      0x4030,
    ],
    [
      "an EOF Packet transformed into an OK Packet",
      Buffer.concat([Buffer.from([0x10, 0x20]), Buffer.from([0x30, 0x40])]),
      0x00,
      0x00,
      0x2010,
      0x4030,
    ],
  ];

  describe.each(fromUnits)(
    "from()",
    (
      unitName,
      packet,
      affectedRows,
      lastInsertId,
      serverStatus,
      warningCount
    ) => {
      test(unitName, () => {
        const packetOk = PacketOk.from(packet);

        expect(packetOk.affectedRows).toBe(affectedRows);
        expect(packetOk.lastInsertId).toBe(lastInsertId);
        expect(packetOk.warningCount).toBe(warningCount);
        expect(packetOk.serverStatus).toBe(serverStatus);
      });
    }
  );

  type IsOKUnit = boolean;
  type IsEOFUnit = boolean;
  type IsUnit = [UnitName, Packet, IsOKUnit, IsEOFUnit];

  const isUnits: IsUnit[] = [
    [
      "a OK Packet #1",
      Buffer.from([0x00, 0x00, 0x00, 0x10, 0x20, 0x30, 0x40]),
      true,
      false,
    ],
    [
      "a OK Packet #2",
      Buffer.from([0x00, 0xfc, 0x10, 0x20, 0x00, 0x10, 0x20, 0x30, 0x40]),
      true,
      false,
    ],
    ["a EOF Packet", Buffer.from([0xfe, 0x10, 0x20, 0x30, 0x40]), true, true],
    ["invalid packet", Buffer.from([0x00]), false, false],
  ];

  describe.each(isUnits)("is()", (unitName, packet, isOKUnit) => {
    test(`${String(isOKUnit)}: ${unitName}`, () => {
      expect(PacketOk.is(packet)).toBe(isOKUnit);
    });
  });

  describe.each(isUnits)(
    "isEOF()",
    (unitName, packet, _isOKUnit, isEOFUnit) => {
      test(`${String(isEOFUnit)}: ${unitName}`, () => {
        expect(PacketOk.isEOF(packet)).toBe(isEOFUnit);
      });
    }
  );
});
