export declare class TimerUtil {
    #private;
    constructor(callback: () => void, ms: number | undefined);
    stop(): void;
    restart(): void;
}
