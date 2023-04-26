export class FewArgumentsError extends Error {
  public cause!: {
    required: number;
    received: number;
  };

  public constructor(
    message: string,
    cause: { cause: FewArgumentsError["cause"] }
  ) {
    super(message, cause);
  }

  public static generate(required: number, received: number) {
    return new FewArgumentsError(
      `Prepared Statement number of arguments is ${required}, but received ${received}`,
      { cause: { required, received } }
    );
  }
}
