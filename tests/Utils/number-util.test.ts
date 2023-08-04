import { BigIntWrapper } from "@Tests/Fixtures/utils";

import { toNumber } from "@/Utils/NumberUtil";

type NumberUnit = [
  input: BigIntWrapper | Parameters<typeof toNumber>[0],
  output: BigIntWrapper | number | undefined,
];

const numbersUnits: NumberUnit[] = [
  // Integers.
  [123, 123],
  [-123, -123],

  // Floats.
  [1.23, 1.23],
  [-1.23, -1.23],

  // BigInt()
  [new BigIntWrapper("123"), 123],
  [
    new BigIntWrapper(0xff_ff_ff_ff_ff_ff_ff_ffn.toString()),
    new BigIntWrapper(0xff_ff_ff_ff_ff_ff_ff_ffn.toString()),
  ],
  [
    new BigIntWrapper((-0xff_ff_ff_ff_ff_ff_ff_ffn).toString()),
    new BigIntWrapper((-0xff_ff_ff_ff_ff_ff_ff_ffn).toString()),
  ],
  [
    new BigIntWrapper(Number.MIN_SAFE_INTEGER.toString()),
    Number.MIN_SAFE_INTEGER,
  ],
  [
    new BigIntWrapper(Number.MAX_SAFE_INTEGER.toString()),
    Number.MAX_SAFE_INTEGER,
  ],

  // Integer strings.
  ["123", 123],
  ["-123", -123],
  [
    0xff_ff_ff_ff_ff_ff_ff_ffn.toString(),
    new BigIntWrapper(0xff_ff_ff_ff_ff_ff_ff_ffn.toString()),
  ],
  [
    (-0xff_ff_ff_ff_ff_ff_ff_ffn).toString(),
    new BigIntWrapper((-0xff_ff_ff_ff_ff_ff_ff_ffn).toString()),
  ],

  // Float strings.
  ["1.23", 1.23],
  ["-1.23", -1.23],

  // Non-integers.
  ["", 0],
  ["-", undefined],
  ["abc", undefined],
];

test.each(numbersUnits)("call toNumber(%j) === %j", (input, converted) => {
  expect(toNumber(input instanceof BigIntWrapper ? input.cast() : input)).toBe(
    converted instanceof BigIntWrapper ? converted.cast() : converted,
  );
});
