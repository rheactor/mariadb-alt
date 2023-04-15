import { TimeFormat } from "@/Formats/TimeFormat";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type ToNativeDateUnits = Array<[string, string, number?]>;

  const toNativeDateUnits: ToNativeDateUnits = [
    ["00:00:00", "1970-01-01T00:00:00.000Z"],
    ["00:00:00.1", "1970-01-01T00:00:00.100Z"],
    ["00:00:00.12", "1970-01-01T00:00:00.120Z"],
    ["00:00:00.123", "1970-01-01T00:00:00.123Z"],
    ["00:00:00.1234", "1970-01-01T00:00:00.123Z"],
    ["10:10:10.123", "1970-01-01T10:10:10.123Z"],
    ["10:10:10.123", "-000555-01-01T10:10:10.123Z", -555],
    ["838:59:59", "1970-02-04T22:59:59.000Z"],
    ["-838:59:59", "1969-11-27T02:59:59.000Z"],
  ];

  describe.each(toNativeDateUnits)("toNativeDate()", (input, output, year) => {
    test(input, () => {
      expect(
        TimeFormat.parse(input)
          .toNativeDate(year ?? 1970)
          .toISOString()
      ).toBe(output);
    });
  });

  test("6-digits .ms", () => {
    const timeFormat = TimeFormat.parse("00:00:00.1234567");

    expect(timeFormat.toNativeDate().toISOString()).toBe(
      "1970-01-01T00:00:00.123Z"
    );

    expect(timeFormat.ms).toBe(123456);
  });
});
