export abstract class Exception<T = unknown> extends Error {
  public details!: T;

  public code?: number;

  public setDetails(code: number | undefined, details: T): this {
    this.details = details;
    this.code = code;

    return this;
  }
}
