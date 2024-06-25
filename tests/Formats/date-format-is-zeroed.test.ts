import { expect, test } from "vitest";

import { DateFormat } from "@/Formats/DateFormat.js";

type Test = [input: string, isZeroed: boolean];

const tests: Test[] = [
  ["0000-00-00", true],
  ["0001-00-00", false],
  ["-000001-00-00", false],
];

test.each(tests)(
  "call DateFormat.parse(%j).isZeroed() === %j",
  (input, isZeroed) => {
    expect(DateFormat.parse(input).isZeroed()).toBe(isZeroed);
  },
);
