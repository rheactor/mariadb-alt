import { DateFormat } from "@/Formats/DateFormat";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type ToNativeDateUnits = Array<[string, string, number?]>;

  const toNativeDateUnits: ToNativeDateUnits = [
    ["2023-03-26", "2023-03-26T00:00:00.000Z"],
    ["2023-03-26", "2023-03-26T10:10:10.010Z", 10],
    ["2023-03-26T01:02:03.456", "2023-03-26T00:00:00.000Z"],
    ["1970-01-01", "1970-01-01T00:00:00.000Z"],
    ["0005-01-01", "0005-01-01T00:00:00.000Z"],
    ["-000005-01-01", "-000005-01-01T00:00:00.000Z"],
    ["0000-00-00", "0000-01-01T00:00:00.000Z"],
    ["-000001-01-01", "-000001-01-01T00:00:00.000Z"],
  ];

  describe.each(toNativeDateUnits)(
    "toNativeDate()",
    (input, output, offset) => {
      test(input, () => {
        expect(
          DateFormat.parse(input)
            .toNativeDate(offset ?? 0, offset ?? 0, offset ?? 0, offset ?? 0)
            .toISOString(),
        ).toBe(output);
      });
    },
  );

  describe("toNativeDate()", () => {
    test("2023-03-26 start of day", () => {
      expect(DateFormat.parse("2023-03-26").toNativeDate().toISOString()).toBe(
        "2023-03-26T00:00:00.000Z",
      );
    });
  });

  describe("isZeroed()", () => {
    test("0000-00-00", () => {
      expect(DateFormat.parse("0000-00-00").isZeroed()).toBe(true);
    });

    test("0001-00-00", () => {
      expect(DateFormat.parse("0001-00-00").isZeroed()).toBe(false);
    });

    test("-000001-00-00", () => {
      expect(DateFormat.parse("0001-00-00").isZeroed()).toBe(false);
    });
  });
});
