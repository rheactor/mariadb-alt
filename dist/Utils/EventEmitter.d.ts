type EventCallback = (...args: any[]) => void;
export declare class EventEmitter {
    #private;
    /** Add a new event listener. */
    on(event: string, callback: EventCallback): void;
    /** Add a new event listener that must be executed a single time. */
    once(event: string, callback: EventCallback): void;
    /** Emit an event by name. */
    emit(event: string, ...args: unknown[]): void;
}
export {};
