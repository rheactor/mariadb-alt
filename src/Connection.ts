import {
  InitialHandshakePacket,
  type InitialHandshakePacket as InitialHandshake,
} from "@/Protocol/Packet/InitialHandshakePacket";
import { EventEmitter } from "node:events";
import { createConnection, type Socket } from "node:net";

const enum Status {
  CONNECTING,
  CONNECTED,
  READY,
  ERROR,
}

export class Connection extends EventEmitter {
  public status: Status = Status.CONNECTING;

  public initialHandshakePacket?: InitialHandshake;

  private readonly socket: Socket;

  public constructor() {
    super();

    const socket = createConnection({
      host: "localhost",
      port: 3306,
    });

    socket.on("connect", () => {
      this.status = Status.CONNECTED;
    });

    socket.on("data", (initialHandshakePacket) => {
      this.initialHandshakePacket = new InitialHandshakePacket(
        initialHandshakePacket.subarray(4)
      );

      this.status = Status.READY;
      this.emit("ready");
    });

    socket.on("error", (err) => {
      this.status = Status.ERROR;
      throw err;
    });

    this.socket = socket;
  }

  public on(
    eventName: "ready",
    listener: (connection: Connection) => void
  ): this {
    return super.on(eventName, listener.bind(this, this));
  }

  public isReady() {
    return this.status === Status.READY;
  }

  public close() {
    this.socket.end();
  }
}
