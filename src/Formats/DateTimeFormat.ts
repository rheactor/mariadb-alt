import { DateFormat } from "@/Formats/DateFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { toNativeDate } from "@/Utils/DatetimeUtil";

export class DateTimeFormat {
  public date!: DateFormat;

  public time!: TimeFormat;

  private constructor() {
    // empty
  }

  public static from(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    seconds: number,
    ms: number
  ): DateTimeFormat {
    const instance = new DateTimeFormat();

    instance.date = DateFormat.from(year, month, day);
    instance.time = TimeFormat.from(hours, minutes, seconds, ms);

    return instance;
  }

  public static parse(datetime: string) {
    const instance = new DateTimeFormat();
    const [date, time] = datetime.split(" ");

    instance.date = DateFormat.parse(date!);
    instance.time = TimeFormat.parse(time!);

    return instance;
  }

  public toNativeDate(): Date {
    return toNativeDate(
      this.date.year,
      this.date.month,
      this.date.day,
      this.time.hours,
      this.time.minutes,
      this.time.seconds,
      this.time.ms
    );
  }
}
