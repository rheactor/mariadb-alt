import { expect, test } from "vitest";

import { TimeFormat } from "@/Formats/TimeFormat";

type Test = [
  input: string,
  year: number | undefined,
  output: string,
  ms: number,
];

const tests: Test[] = [
  ["00:00:00", undefined, "1970-01-01T00:00:00.000Z", 0],
  ["00:00:00.1", undefined, "1970-01-01T00:00:00.100Z", 100],
  ["00:00:00.12", undefined, "1970-01-01T00:00:00.120Z", 120],
  ["00:00:00.123", undefined, "1970-01-01T00:00:00.123Z", 123],
  ["00:00:00.1234", undefined, "1970-01-01T00:00:00.123Z", 1234],
  ["00:00:00.1234567", undefined, "1970-01-01T00:00:00.123Z", 123_456], // Intentional "7"
  ["10:10:10.123", undefined, "1970-01-01T10:10:10.123Z", 123],
  ["10:10:10.123", -555, "-000555-01-01T10:10:10.123Z", 123],
  ["838:59:59", undefined, "1970-02-04T22:59:59.000Z", 0],
  ["-838:59:59", undefined, "1969-11-27T02:59:59.000Z", 0],
];

test.each(tests)(
  "call TimeFormat.parse(%j).toNativeDate(year: %j) === %j, with ms = %j",
  (input, year, output, ms) => {
    const inputParsed = TimeFormat.parse(input);
    const inputToNative =
      year === undefined
        ? inputParsed.toNativeDate()
        : inputParsed.toNativeDate(year);

    expect(inputToNative.toISOString()).toBe(output);
    expect(inputParsed.ms === ms);
  },
);
