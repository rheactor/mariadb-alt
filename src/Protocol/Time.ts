import { toNativeDate } from "@/Utils/DatetimeUtil";

const timeParseRegexp = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;

export class Time {
  public hours: number;

  public minutes: number;

  public seconds: number;

  public ms: number;

  public constructor(time: string) {
    const dateParsed = timeParseRegexp.exec(time)!;

    this.hours = Number(dateParsed[1]);
    this.minutes = Number(dateParsed[2]);
    this.seconds = Number(dateParsed[3]);
    this.ms =
      dateParsed[4] === undefined
        ? 0
        : Number(dateParsed[4].substring(0, 3).padEnd(3, "0"));
  }

  public toNativeDate(year = 1970, month = 1, day = 1): globalThis.Date {
    return toNativeDate(
      year,
      month,
      day,
      this.hours,
      this.minutes,
      this.seconds,
      this.ms
    );
  }
}
