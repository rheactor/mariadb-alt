import { createPacket } from "@/Protocol/Packet/Packet";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  test("basic", () => {
    expect(createPacket(Buffer.from([0x01]), 1)).toStrictEqual(
      Buffer.from([0x01, 0x00, 0x00, 0x01, 0x01])
    );
  });

  test("empty", () => {
    expect(createPacket(Buffer.from([]), 0)).toStrictEqual(
      Buffer.from([0x00, 0x00, 0x00, 0x00])
    );
  });

  test("loop sequence if over 0xFF", () => {
    expect(createPacket(Buffer.from([]), 0xff + 0x10 + 1)).toStrictEqual(
      Buffer.from([0x00, 0x00, 0x00, 0x10])
    );
  });
});
