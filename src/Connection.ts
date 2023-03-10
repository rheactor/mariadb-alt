import {
  InitialHandshakePacket,
  type InitialHandshakePacket as InitialHandshake,
} from "@/Protocol/Packet/InitialHandshakePacket";
import { EventEmitter } from "@/Utils/EventEmitter";
import { Socket } from "node:net";

const enum Status {
  CONNECTING,
  CONNECTED,
  READY,
  ERROR,
}

interface ConnectionOptions {
  /** Connection host. Default is "localhost". */
  host?: string;

  /** Connection port number. Default is 3306. */
  port?: number;

  /** Connection timeout. */
  timeout?: number;
}

abstract class ConnectionEvents {
  private readonly eventsEmitter = new EventEmitter();

  public on(
    eventName: "error",
    listener: (connection: Connection, error: Error) => void
  ): void;

  public on(
    eventName: "ready",
    listener: (connection: Connection) => void
  ): void;

  public on(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): void {
    this.eventsEmitter.on(eventName, listener);
  }

  public once(
    eventName: "error",
    listener: (connection: Connection, error: Error) => void
  ): void;

  public once(
    eventName: "ready",
    listener: (connection: Connection) => void
  ): void;

  public once(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void
  ): void {
    this.eventsEmitter.once(eventName, listener);
  }

  public emit(
    eventName: string,
    ...args: Parameters<EventEmitter["emit"]>[1]
  ): void {
    this.eventsEmitter.emit(eventName, ...args);
  }
}

export class Connection extends ConnectionEvents {
  public status: Status = Status.CONNECTING;

  public initialHandshakePacket?: InitialHandshake;

  private readonly socket: Socket;

  public constructor(options: ConnectionOptions = {}) {
    super();

    const socket = new Socket();

    socket.on("connect", () => {
      this.status = Status.CONNECTED;
    });

    socket.on("data", (initialHandshakePacket) => {
      this.initialHandshakePacket = new InitialHandshakePacket(
        initialHandshakePacket.subarray(4)
      );

      this.status = Status.READY;
      this.emit("ready", this);
    });

    socket.on("error", (err) => {
      this.status = Status.ERROR;
      this.emit("error", this, err);
    });

    if (options.timeout !== undefined) {
      socket.setTimeout(options.timeout);
    }

    socket.connect(options.port ?? 3306, options.host ?? "localhost");

    this.socket = socket;
  }

  public isError() {
    return this.status === Status.ERROR;
  }

  public isReady() {
    return this.status === Status.READY;
  }

  public close() {
    this.socket.end();
  }
}
