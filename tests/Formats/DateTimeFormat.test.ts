import { DateTimeFormat } from "@/Formats/DateTimeFormat";

describe("Formats/DateTimeFormat", () => {
  type ToNativeDateUnits = Array<[string, string, number?]>;

  const toNativeDateUnits: ToNativeDateUnits = [
    ["1970-01-01 00:00:00", "1970-01-01T00:00:00.000Z"],
    ["1970-01-01 00:00:00.1", "1970-01-01T00:00:00.100Z"],
    ["1970-01-01 00:00:00.12", "1970-01-01T00:00:00.120Z"],
    ["1970-01-01 00:00:00.123", "1970-01-01T00:00:00.123Z"],
    ["1970-01-01 00:00:00.1234", "1970-01-01T00:00:00.123Z"],
    ["1970-01-01 10:10:10.123", "1970-01-01T10:10:10.123Z"],
    ["-000555-01-01 10:10:10.123", "-000555-01-01T10:10:10.123Z"],
  ];

  describe.each(toNativeDateUnits)("toNativeDate()", (input, output) => {
    test(input, () => {
      expect(DateTimeFormat.parse(input).toNativeDate().toISOString()).toBe(
        output
      );
    });
  });
});
