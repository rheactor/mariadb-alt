import { expect, test } from "vitest";

import { PacketError } from "@/Protocol/Packet/PacketError";

type Test = [buffer: number[], is: boolean];

const tests: Test[] = [
  [Buffer.from([0xff]).toJSON().data, true],
  [Buffer.from([0x00]).toJSON().data, false],
];

test.each(tests)("call PacketError.is(%j) === %j", (buffer, is) => {
  expect(PacketError.is(Buffer.from(buffer))).toBe(is);
});
