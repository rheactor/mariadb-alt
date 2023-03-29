import { toNativeDate } from "@/Utils/DatetimeUtil";

const timeParseRegexp = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;

export class TimeFormat {
  public hours: number;

  public minutes: number;

  public seconds: number;

  public ms: number;

  public constructor(time: string) {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const timeParsed = time.match(timeParseRegexp)!;

    this.hours = Number(timeParsed[1]);
    this.minutes = Number(timeParsed[2]);
    this.seconds = Number(timeParsed[3]);
    this.ms =
      timeParsed[4] === undefined
        ? 0
        : Number(timeParsed[4].substring(0, 3).padEnd(3, "0"));
  }

  public toNativeDate(year = 1970, month = 1, day = 1): Date {
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
