export class FewArgumentsError extends Error {
  public cause!: {
    required: number;
    received: number;
  };

  private constructor(
    message: string,
    options: ErrorOptions & { cause: FewArgumentsError["cause"] }
  ) {
    super(message, options);

    this.cause = options.cause;
  }

  public static generate(required: number, received: number) {
    return new FewArgumentsError(
      `Prepared Statement number of arguments is ${required}, but received ${received}`,
      { cause: { required, received } }
    );
  }
}
