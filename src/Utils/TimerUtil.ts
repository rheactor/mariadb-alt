export class TimerUtil {
  private timeout: ReturnType<typeof setTimeout> | undefined;

  public constructor(
    private readonly callback: () => void,
    private readonly ms: number | undefined
  ) {
    this.restart();
  }

  public stop() {
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  public restart() {
    if (this.ms !== undefined) {
      this.timeout = setTimeout(this.callback, this.ms);
    }
  }
}
