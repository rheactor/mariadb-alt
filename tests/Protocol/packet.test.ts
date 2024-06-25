import { expect, test } from "vitest";

import { createPacket } from "@/Protocol/Packet/Packet.js";

type Test = [input: number[], sequence: number, output: number[]];

const tests: Test[] = [
  [[0x01], 1, [0x01, 0x00, 0x00, 0x01, 0x01]],
  [[], 0, [0x00, 0x00, 0x00, 0x00]],
  [[], 0xff + 0x10 + 1, [0x00, 0x00, 0x00, 0x10]],
];

test.each(tests)(
  "call createPacket(buffer: %j, sequence: %j) === buffer %j",
  (input, sequence, output) => {
    expect(createPacket(Buffer.from(input), sequence)).toStrictEqual(
      Buffer.from(output),
    );
  },
);
