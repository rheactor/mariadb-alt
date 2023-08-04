export const delay = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export class BigIntWrapper {
  public constructor(private readonly bigint: string) {}

  public cast() {
    return BigInt(this.bigint);
  }
}
