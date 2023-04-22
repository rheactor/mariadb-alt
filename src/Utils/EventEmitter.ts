// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

interface EventListener {
  eventId: number;
  callback: EventCallback;
  once?: true;
}

let eventId = 0;

export class EventEmitter {
  readonly #events = new Map<string, Map<number, EventListener>>();

  /** Add a new event listener. */
  public on(event: string, callback: EventCallback) {
    if (!this.#events.has(event)) {
      this.#events.set(event, new Map());
    }

    this.#events.get(event)!.set(eventId, { eventId: eventId++, callback });
  }

  /** Add a new event listener that must be executed a single time. */
  public once(event: string, callback: EventCallback) {
    if (!this.#events.has(event)) {
      this.#events.set(event, new Map());
    }

    this.#events
      .get(event)!
      .set(eventId, { eventId: eventId++, callback, once: true });
  }

  /** Emit an event by name. */
  public emit(
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) {
    const events = this.#events.get(event);

    events?.forEach((ev) => {
      ev.callback(...args);

      if (ev.once) {
        events.delete(ev.eventId);
      }
    });
  }
}
