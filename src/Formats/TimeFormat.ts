import { toNativeDate } from "@/Utils/DatetimeUtil";

const timeParseRegexp = /^(-?\d{2,3}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?/;

export class TimeFormat {
  public hours!: number;

  public minutes!: number;

  public seconds!: number;

  public ms!: number;

  private constructor() {
    // empty
  }

  public static from(
    hours: number,
    minutes: number,
    seconds: number,
    ms: number,
  ): TimeFormat {
    const instance = new TimeFormat();

    instance.hours = hours;
    instance.minutes = minutes;
    instance.seconds = seconds;
    instance.ms = ms;

    return instance;
  }

  public static parse(time: string): TimeFormat {
    const instance = new TimeFormat();

    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const timeParsed = time.match(timeParseRegexp)!;

    instance.hours = Number(timeParsed[1]);
    instance.minutes = Number(timeParsed[2]);
    instance.seconds = Number(timeParsed[3]);
    instance.ms =
      timeParsed[4] === undefined ? 0 : Number(timeParsed[4].padEnd(6, "0"));

    return instance;
  }

  public toNativeDate(year = 1970, month = 1, day = 1): Date {
    return toNativeDate(
      year,
      month,
      day,
      this.hours,
      this.minutes,
      this.seconds,
      this.ms,
    );
  }
}
