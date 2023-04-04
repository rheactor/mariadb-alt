import { toNativeDate } from "@/Utils/DatetimeUtil";

const dateParseRegexp = /^(-?\d{4,6})-(\d{2})-(\d{2})/;

export class DateFormat {
  public day!: number;

  public month!: number;

  public year!: number;

  private zeroed!: boolean;

  private constructor() {
    // empty
  }

  public static from(year: number, month: number, day: number): DateFormat {
    const instance = new DateFormat();

    instance.year = year;
    instance.month = month;
    instance.day = day;
    instance.zeroed = year === 0 && month === 0 && day === 0;

    return instance;
  }

  public static parse(date: string) {
    const instance = new DateFormat();
    const dateParsed = dateParseRegexp.exec(date)!;

    instance.year = Number(dateParsed[1]);
    instance.month = Math.max(1, Number(dateParsed[2]));
    instance.day = Math.max(1, Number(dateParsed[3]));
    instance.zeroed = date === "0000-00-00";

    return instance;
  }

  public toNativeDate(hours = 0, minutes = 0, seconds = 0, ms = 0): Date {
    return toNativeDate(
      this.year,
      this.month,
      this.day,
      hours,
      minutes,
      seconds,
      ms * 1000
    );
  }

  public isZeroed() {
    return this.zeroed;
  }
}
