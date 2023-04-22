import { toNumber } from "@/Utils/NumberUtil";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type InputType = Parameters<typeof toNumber>[0];
  type NumberUnit = [InputType, bigint | number | undefined];

  const numbersUnits: NumberUnit[] = [
    // Integers.
    [123, 123],
    [-123, -123],

    // Floats.
    [1.23, 1.23],
    [-1.23, -1.23],

    // BigInt()
    [123n, 123],
    [0xffffffffffffffffn, 0xffffffffffffffffn],
    [-0xffffffffffffffffn, -0xffffffffffffffffn],
    [BigInt(Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER],
    [BigInt(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],

    // Integer strings.
    ["123", 123],
    ["-123", -123],
    [0xffffffffffffffffn.toString(), 0xffffffffffffffffn],
    [(-0xffffffffffffffffn).toString(), -0xffffffffffffffffn],

    // Float strings.
    ["1.23", 1.23],
    ["-1.23", -1.23],

    // Non-integers.
    ["", undefined],
    ["-", undefined],
    ["abc", undefined],
  ];

  describe.each(numbersUnits)("toNumber()", (input, converted) => {
    if (converted !== undefined) {
      test(`${typeof input} ${String(input)}: ${String(converted)}`, () => {
        expect(toNumber(input)).toBe(converted);
      });
    }
  });
});
