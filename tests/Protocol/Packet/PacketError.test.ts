import { PacketError } from "@/Protocol/Packet/PacketError";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type UnitName = string;
  type Packet = Buffer;
  type ErrorCode = number;
  type ErrorState = string;
  type ErrorMessage = string;
  type PacketUnit = [UnitName, Packet, ErrorCode, ErrorState, ErrorMessage];

  const packetsUnits: PacketUnit[] = [
    [
      "Example #1",
      Buffer.concat([
        Buffer.from([0x48, 0x04]),
        Buffer.from("#"),
        Buffer.from("HY000"),
        Buffer.from("No tables used"),
      ]),
      0x0448,
      "HY000",
      "No tables used",
    ],
  ];

  describe.each(packetsUnits)(
    "from()",
    (unitName, packet, errorCode, errorState, errorMessage) => {
      test(unitName, () => {
        const packetError = PacketError.from(packet);

        expect(packetError.code).toBe(errorCode);
        expect(packetError.state).toBe(errorState);
        expect(packetError.message).toBe(errorMessage);
      });
    },
  );

  type IsUnit = [UnitName, Packet, boolean];

  const isUnits: IsUnit[] = [
    ["valid packet", Buffer.from([0xff]), true],
    ["invalid packet", Buffer.from([0x00]), false],
  ];

  describe.each(isUnits)("is()", (unitName, packet, is) => {
    test(`${String(is)}: ${unitName}`, () => {
      expect(PacketError.is(packet)).toBe(is);
    });
  });
});
