import { createHandshakeResponse } from "@/Protocol/Packet/HandshakeResponse";
import { InitialHandshake } from "@/Protocol/Packet/InitialHandshake";
import { Packet, type PacketKind } from "@/Protocol/Packet/Packet";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { EventEmitter } from "@/Utils/EventEmitter";
import { Socket } from "node:net";

const enum Status {
  CONNECTING,
  AUTHENTICATING,
  AUTHENTICATED,
  EXECUTING,
  ERROR,
}

interface ConnectionOptions {
  /** Connection host. Default is "localhost". */
  host: string;

  /** Connection port number. Default is 3306. */
  port: number;

  /** Connection user. Default is "root". */
  user: string;

  /** Connection password. Default is empty. */
  password?: string;

  /** Connection database. Default is none. */
  database?: string;

  /** Connection timeout. */
  timeout?: number;
}

type ConnectionEventsError = "error";

type ConnectionEventsCommon =
  | "authenticated"
  | "authenticating"
  | "closed"
  | "connected"
  | "ready";

interface ConnectionCommand {
  buffer: Buffer;
  resolve(packet: PacketKind): void;
}

abstract class ConnectionEvents {
  private readonly eventsEmitter = new EventEmitter();

  public on(
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Error) => void
  ): void;

  public on(
    eventName: ConnectionEventsCommon,
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
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Error) => void
  ): void;

  public once(
    eventName: ConnectionEventsCommon,
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
    eventName: ConnectionEventsCommon | ConnectionEventsError,
    ...args: Parameters<EventEmitter["emit"]>[1]
  ): void {
    this.eventsEmitter.emit(eventName, ...args);
  }
}

export class Connection extends ConnectionEvents {
  public status: Status = Status.CONNECTING;

  public initialHandshake?: InitialHandshake;

  private connected = false;

  private readonly commands: ConnectionCommand[] = [];

  private readonly socket: Socket;

  private readonly options: ConnectionOptions;

  public constructor(options: Partial<ConnectionOptions> = {}) {
    super();

    this.options = {
      host: "localhost",
      port: 3306,
      user: "root",
      ...options,
    };

    const socket = new Socket();

    socket.once("connect", () => {
      this.connected = true;
      this.emit("connected", this);
    });

    socket.once("data", (data) => {
      this.processResponse(data);
    });

    socket.once("error", (err) => {
      this.status = Status.ERROR;
      this.emit("error", this, err);
    });

    socket.once("close", () => {
      this.emit("closed", this);
    });

    if (options.timeout !== undefined) {
      socket.setTimeout(options.timeout);
    }

    socket.connect(this.options.port, this.options.host);

    this.socket = socket;
  }

  public isConnected() {
    return this.connected;
  }

  public isError() {
    return this.status === Status.ERROR;
  }

  public isAuthenticating() {
    return this.status === Status.AUTHENTICATING;
  }

  public isAuthenticated() {
    return this.status === Status.AUTHENTICATED;
  }

  public async ping() {
    return this.commandQueue(Buffer.from([0x0e]));
  }

  public close() {
    this.socket.end();
  }

  private async commandQueue(buffer: Buffer) {
    return new Promise<PacketKind>((resolve) => {
      this.commands.push({ buffer, resolve });
      this.commandRun();
    });
  }

  private commandRun() {
    if (this.status === Status.AUTHENTICATED) {
      const command = this.commands.shift();

      if (!command) {
        return;
      }

      this.status = Status.EXECUTING;

      this.socket.once("data", (data) => {
        this.status = Status.AUTHENTICATED;

        command.resolve(Packet.fromResponse(data));

        this.commandRun();
      });

      this.socket.write(Packet.from(command.buffer, 0));
    }
  }

  private processResponse(data: Buffer) {
    const initialHandshakePacket = new Packet(data);

    this.initialHandshake = new InitialHandshake(initialHandshakePacket.body);

    this.socket.once("data", (serverData) => {
      const serverResponse = Packet.fromResponse(serverData);

      if (serverResponse instanceof PacketOk) {
        this.status = Status.AUTHENTICATED;
        this.emit("authenticated", this);
        this.commandRun();
      } else if (serverResponse instanceof PacketError) {
        this.status = Status.ERROR;
        this.emit(
          "error",
          this,
          new Error(serverResponse.message, {
            cause: serverResponse,
          })
        );
        this.close();
      }
    });

    const handshakeResponse = Packet.from(
      createHandshakeResponse(
        this.initialHandshake.authSeed,
        this.initialHandshake.authPluginName,
        this.options.user,
        this.options.password ?? "",
        this.options.database,
        0xffffffff
      ),
      initialHandshakePacket.sequence + 1
    );

    this.status = Status.AUTHENTICATING;
    this.emit("authenticating", this);

    this.socket.write(handshakeResponse);
  }
}
