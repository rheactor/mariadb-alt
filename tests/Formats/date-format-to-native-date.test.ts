import { DateFormat } from "@/Formats/DateFormat";

type Test = [input: string, offset: number | undefined, output: string];

const tests: Test[] = [
  ["2023-03-26", undefined, "2023-03-26T00:00:00.000Z"],
  ["2023-03-26", 10, "2023-03-26T10:10:10.010Z"],
  ["2023-03-26T01:02:03.456", undefined, "2023-03-26T00:00:00.000Z"],
  ["1970-01-01", undefined, "1970-01-01T00:00:00.000Z"],
  ["0005-01-01", undefined, "0005-01-01T00:00:00.000Z"],
  ["-000005-01-01", undefined, "-000005-01-01T00:00:00.000Z"],
  ["0000-00-00", undefined, "0000-01-01T00:00:00.000Z"],
  ["-000001-01-01", undefined, "-000001-01-01T00:00:00.000Z"],
];

test.each(tests)(
  "call DateFormat.parse(%j).toNativeDate(hours/minutes/seconds/ms: %j) === %j",
  (input, offset, output) => {
    const inputParsed = DateFormat.parse(input);
    const inputAsNative =
      offset === undefined
        ? inputParsed.toNativeDate()
        : inputParsed.toNativeDate(offset, offset, offset, offset);

    expect(inputAsNative.toISOString()).toBe(output);
  },
);
