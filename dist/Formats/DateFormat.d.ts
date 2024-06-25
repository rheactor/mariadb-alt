export declare class DateFormat {
    #private;
    day: number;
    month: number;
    year: number;
    private constructor();
    static from(year: number, month: number, day: number): DateFormat;
    static parse(date: string): DateFormat;
    toNativeDate(hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
    isZeroed(): boolean;
}
