import { Time } from "@/Protocol/Time";

describe("Protocol/Time", () => {
  type ToNativeDateUnits = Array<[string, string, number?]>;

  const toNativeDateUnits: ToNativeDateUnits = [
    ["00:00:00", "1970-01-01T00:00:00.000Z"],
    ["00:00:00.1", "1970-01-01T00:00:00.100Z"],
    ["00:00:00.12", "1970-01-01T00:00:00.120Z"],
    ["00:00:00.123", "1970-01-01T00:00:00.123Z"],
    ["00:00:00.1234", "1970-01-01T00:00:00.123Z"],
    ["10:10:10.123", "1970-01-01T10:10:10.123Z"],
  ];

  describe.each(toNativeDateUnits)("toNativeDate()", (input, output, year) => {
    test(input, () => {
      expect(new Time(input).toNativeDate(year ?? 1970).toISOString()).toBe(
        output
      );
    });
  });
});
