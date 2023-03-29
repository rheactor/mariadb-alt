import { toNativeDate } from "@/Utils/DatetimeUtil";

const dateParseRegexp = /^(-?\d{4,6})-(\d{2})-(\d{2})/;

export class DateFormat {
  public day: number;

  public month: number;

  public year: number;

  public constructor(private readonly date: string) {
    const dateParsed = dateParseRegexp.exec(date)!;

    this.year = Number(dateParsed[1]);
    this.month = Math.max(1, Number(dateParsed[2]));
    this.day = Math.max(1, Number(dateParsed[3]));
  }

  public toNativeDate(hours = 0, minutes = 0, seconds = 0, ms = 0): Date {
    return toNativeDate(
      this.year,
      this.month,
      this.day,
      hours,
      minutes,
      seconds,
      ms
    );
  }

  public isZeroed() {
    return this.date === "0000-00-00";
  }
}
