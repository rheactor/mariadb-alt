export declare class TimeFormat {
    hours: number;
    minutes: number;
    seconds: number;
    ms: number;
    private constructor();
    static from(hours: number, minutes: number, seconds: number, ms: number): TimeFormat;
    static parse(time: string): TimeFormat;
    toNativeDate(year?: number, month?: number, day?: number): Date;
}
