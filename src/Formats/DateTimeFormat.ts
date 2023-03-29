import { DateFormat } from "@/Formats/DateFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { toNativeDate } from "@/Utils/DatetimeUtil";

export class DateTimeFormat {
  public date: DateFormat;

  public time: TimeFormat;

  public constructor(datetime: string) {
    const [date, time] = datetime.split(" ");

    this.date = new DateFormat(date!);
    this.time = new TimeFormat(time!);
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
