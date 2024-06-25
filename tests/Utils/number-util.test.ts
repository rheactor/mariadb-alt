import { expect, test } from "vitest";

import { toNumber } from "@/Utils/NumberUtil.js";

type NumberUnit = [
  input: Parameters<typeof toNumber>[0],
  output: bigint | number | undefined,
];

const numbersUnits: NumberUnit[] = [
  // Integers.
  [123, 123],
  [-123, -123],

  // Floats.
  [1.23, 1.23],
  [-1.23, -1.23],

  // BigInt()
  [123n, 123],
  [0xff_ff_ff_ff_ff_ff_ff_ffn, 0xff_ff_ff_ff_ff_ff_ff_ffn],
  [-0xff_ff_ff_ff_ff_ff_ff_ffn, -0xff_ff_ff_ff_ff_ff_ff_ffn],
  [BigInt(Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER],
  [BigInt(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],

  // Integer strings.
  ["123", 123],
  ["-123", -123],
  [0xff_ff_ff_ff_ff_ff_ff_ffn.toString(), 0xff_ff_ff_ff_ff_ff_ff_ffn],
  [(-0xff_ff_ff_ff_ff_ff_ff_ffn).toString(), -0xff_ff_ff_ff_ff_ff_ff_ffn],

  // Float strings.
  ["1.23", 1.23],
  ["-1.23", -1.23],

  // Non-integers.
  ["", 0],
  ["-", undefined],
  ["abc", undefined],
];

test.each(numbersUnits)("call toNumber(%s) === %s", (input, converted) => {
  expect(toNumber(input)).toBe(converted);
});
