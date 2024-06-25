import { DateFormat } from "@/Formats/DateFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
export declare class DateTimeFormat {
    date: DateFormat;
    time: TimeFormat;
    private constructor();
    static from(year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number): DateTimeFormat;
    static parse(datetime: string): DateTimeFormat;
    toNativeDate(): Date;
}
