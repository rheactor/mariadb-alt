export class TimerUtil {
  #timeout: ReturnType<typeof setTimeout> | undefined;

  readonly #callback: () => void;

  readonly #ms: number | undefined;

  public constructor(callback: () => void, ms: number | undefined) {
    this.#callback = callback;
    this.#ms = ms;
    this.restart();
  }

  public stop() {
    clearTimeout(this.#timeout);
    this.#timeout = undefined;
  }

  public restart() {
    if (this.#ms !== undefined) {
      this.#timeout = setTimeout(this.#callback, this.#ms);
    }
  }
}
