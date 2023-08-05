import { expect, test } from "vitest";

import { PacketError } from "@/Protocol/Packet/PacketError";

type Test = [
  buffer: string,
  errorCode: number,
  errorState: string,
  errorMessage: string,
];

const tests: Test[] = [
  [
    Buffer.concat([
      Buffer.from([0x48, 0x04]),
      Buffer.from("#"),
      Buffer.from("HY000"),
      Buffer.from("No tables used"),
    ]).toString(),
    0x04_48,
    "HY000",
    "No tables used",
  ],
];

test.each(tests)(
  "call PacketError.from(%j) === { code: %j, state: %j, message: %j }",
  (buffer, errorCode, errorState, errorMessage) => {
    const packetError = PacketError.from(Buffer.from(buffer));

    expect(packetError.code).toBe(errorCode);
    expect(packetError.state).toBe(errorState);
    expect(packetError.message).toBe(errorMessage);
  },
);
