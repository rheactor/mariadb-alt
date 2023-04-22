import { Socket } from "node:net";

import { Handshake } from "@/Protocol/Handshake/Handshake";
import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { ExecuteError } from "@/Protocol/Packet/Errors/ExecuteError";
import { QueryError } from "@/Protocol/Packet/Errors/QueryError";
import { createPacket } from "@/Protocol/Packet/Packet";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet, type Row } from "@/Protocol/Packet/PacketResultSet";
import {
  PacketReassembler,
  type PacketType,
} from "@/Protocol/PacketReassembler/PacketReassembler";
import { type Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler";
import { ReassemblerPSResponse } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPSResponse";
import { ReassemblerPSResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPSResultSet";
import { ReassemblerResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet";
import {
  createExecutePacket,
  type ExecuteArgument,
} from "@/Protocol/PreparedStatement/PreparedStatement";
import { type PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";
import { EventEmitter } from "@/Utils/EventEmitter";

const enum Status {
  CONNECTING,
  AUTHENTICATING,
  READY,
  EXECUTING,
  ERROR,
}

export interface ConnectionOptions {
  /** Connection host. Default is "localhost". */
  host: string;

  /** Connection port number. Default is 3306. */
  port: number;

  /** Connection user. Default is "root". */
  user: string;

  /** Connection password. Default is empty. */
  password?: string;

  /** Connection database. Default is none. */
  database: string;

  /** Do something with the connection after it is authenticated. */
  afterAuthenticated?(this: Connection): void;
}

type ConnectionEventsError = "error";

type ConnectionEventsCommon =
  | "authenticated"
  | "authenticating"
  | "closed"
  | "connected";

class ConnectionCommand {
  public constructor(
    public readonly buffer: Buffer,
    public resolve: (data: PacketType) => void,
    public reassembler: Reassembler | undefined,
    public sequence: number
  ) {}
}

abstract class ConnectionEvents {
  readonly #eventsEmitter = new EventEmitter();

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
    this.#eventsEmitter.on(eventName, listener);
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
    this.#eventsEmitter.once(eventName, listener);
  }

  public emit(
    eventName: ConnectionEventsCommon | ConnectionEventsError,
    ...args: Parameters<EventEmitter["emit"]>[1]
  ): void {
    this.#eventsEmitter.emit(eventName, ...args);
  }
}

export class Connection extends ConnectionEvents {
  public status: Status = Status.CONNECTING;

  #connected = false;

  #commands: ConnectionCommand[] = [];

  readonly #socket: Socket;

  readonly #options: ConnectionOptions;

  #wasUsed = false;

  public constructor(
    options: Partial<ConnectionOptions> & Pick<ConnectionOptions, "database">
  ) {
    super();

    this.#options = {
      host: "localhost",
      port: 3306,
      user: "root",
      ...options,
    };

    const socket = new Socket();

    socket.once("connect", () => {
      this.#connected = true;
      this.emit("connected", this);
    });

    socket.once("data", (data) => {
      this.#authenticate(data);
    });

    socket.once("error", (err) => {
      this.status = Status.ERROR;
      this.emit("error", this, err);
    });

    socket.once("close", () => {
      this.emit("closed", this);
    });

    socket.connect(this.#options.port, this.#options.host);

    this.#socket = socket;
  }

  public get wasUsed() {
    return this.#wasUsed;
  }

  public isConnected() {
    return this.#connected;
  }

  public isError() {
    return this.status === Status.ERROR;
  }

  public isAuthenticating() {
    return this.status === Status.AUTHENTICATING;
  }

  public isAuthenticated() {
    return this.status === Status.READY;
  }

  public async ping() {
    return this.#commandQueue(Buffer.from([0x0e]));
  }

  public async queryDetailed(sql: string, args?: ExecuteArgument[]) {
    if (args !== undefined && args.length > 0) {
      return this.#commandQueue(
        Buffer.concat([Buffer.from([0x16]), Buffer.from(sql)]),
        new ReassemblerPSResponse()
      ).then(async (packet) => {
        if (packet instanceof PacketError) {
          return packet;
        }

        const response = packet as PreparedStatementResponse;

        return this.#commandQueue(
          createExecutePacket(response, args),
          new ReassemblerPSResultSet(),
          true
        );
      });
    }

    return this.#commandQueue(
      Buffer.concat([Buffer.from([0x03]), Buffer.from(sql)]),
      new ReassemblerResultSet()
    );
  }

  public async query<T extends object = Row>(
    sql: string,
    args?: ExecuteArgument[]
  ) {
    return this.queryDetailed(sql, args).then((result) => {
      if (
        result instanceof PacketResultSet ||
        result instanceof PreparedStatementResultSet
      ) {
        return result.getRows<T>();
      }

      if (result instanceof PacketError) {
        throw new QueryError("query error", { cause: result });
      }

      throw new QueryError("unexpected query response type", {
        cause: result,
      });
    });
  }

  public async execute(sql: string, args?: ExecuteArgument[]) {
    return this.queryDetailed(sql, args).then((result) => {
      if (result instanceof PacketOk) {
        return result;
      }

      if (result instanceof PacketError) {
        throw new ExecuteError("query error", { cause: result });
      }

      throw new ExecuteError("unexpected query response type", {
        cause: result,
      });
    });
  }

  public async close(): Promise<void> {
    if (!this.#connected) {
      this.#socket.end();

      return undefined;
    }

    return new Promise((resolve) => {
      this.#socket.once("end", resolve);
      this.#commandQueue(Buffer.from([0x01]));
    });
  }

  async #commandQueue(
    buffer: Buffer,
    reassembler: Reassembler | undefined = undefined,
    prioritize = false,
    sequence = 0
  ) {
    return new Promise<PacketType>((resolve) => {
      const command = new ConnectionCommand(
        buffer,
        resolve,
        reassembler,
        sequence
      );

      if (prioritize) {
        this.#commands.unshift(command);
      } else {
        this.#commands.push(command);
      }

      this.#commandRun();
    });
  }

  #commandRun() {
    if (this.status !== Status.READY) {
      return;
    }

    const command = this.#commands.shift();

    if (!command) {
      return;
    }

    this.status = Status.EXECUTING;
    this.#wasUsed = true;

    // eslint-disable-next-line promise/catch-or-return
    this.#send(command).finally(() => {
      this.status = Status.READY;
      this.#commandRun();
    });
  }

  async #send(command: ConnectionCommand) {
    return new Promise<void>((resolve) => {
      const reassembler = new PacketReassembler((data) => {
        this.#socket.off("data", reassemblerPush);

        command.resolve(data);
        resolve();
      }, command.reassembler);

      const reassemblerPush = reassembler.push.bind(reassembler);

      this.#socket.on("data", reassemblerPush);
      this.#socket.write(createPacket(command.buffer, command.sequence));
    });
  }

  #authenticate(data: Buffer) {
    this.status = Status.AUTHENTICATING;
    this.emit("authenticating", this);

    const handshake = new Handshake(data.subarray(4));
    const handshakeResponse = createHandshakeResponse(
      handshake.authSeed,
      handshake.authPluginName,
      this.#options.user,
      this.#options.password ?? "",
      this.#options.database,
      0xffffffff
    );

    this.#send(
      new ConnectionCommand(
        handshakeResponse,
        (response) => {
          if (response instanceof PacketOk) {
            this.status = Status.READY;
            this.emit("authenticated", this);

            if (this.#options.afterAuthenticated) {
              const queuedCommands = this.#commands;

              this.#commands = [];
              this.#options.afterAuthenticated.call(this);
              this.#wasUsed = false;
              this.#commands = queuedCommands;
            }

            this.#commandRun();

            return;
          }

          // if (response instanceof PacketError)
          this.status = Status.ERROR;
          this.emit(
            "error",
            this,
            new Error((response as PacketError).message, {
              cause: response,
            })
          );

          this.close();
        },
        undefined,
        1
      )
    );
  }
}
