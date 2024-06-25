export declare abstract class Exception<T = unknown> extends Error {
    details: T;
    code?: number;
    setDetails(code: number | undefined, details: T): this;
}
