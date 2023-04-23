import { Socket } from "node:net";

import { ExecuteError } from "@/Errors/ExecuteError";
import { PacketError } from "@/Errors/PacketError";
import { QueryError } from "@/Errors/QueryError";
import { TooManyArgumentsError } from "@/Errors/TooManyArgumentsError";
import { Handshake } from "@/Protocol/Handshake/Handshake";
import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { createPacket } from "@/Protocol/Packet/Packet";
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
  createClosePacket,
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
    public reject: (error: Error) => void,
    public reassembler: Reassembler | false | undefined,
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

  public hasError() {
    return this.status === Status.ERROR;
  }

  public isAuthenticating() {
    return this.status === Status.AUTHENTICATING;
  }

  public hasAuthenticated() {
    return this.status === Status.READY;
  }

  public async ping() {
    return this.#commandQueue(Buffer.from([0x0e]));
  }

  public async queryDetailed(sql: string, args?: ExecuteArgument[]) {
    if (args !== undefined && args.length > 0) {
      if (args.length > 0xffff) {
        throw new TooManyArgumentsError(
          `Prepared Statements supports only ${0xffff} arguments`
        );
      }

      return this.#commandQueue(
        Buffer.concat([Buffer.from([0x16]), Buffer.from(sql)]),
        new ReassemblerPSResponse()
      ).then(async (packet) => {
        if (packet instanceof PacketError) {
          throw packet;
        }

        const response = packet as PreparedStatementResponse;

        return this.#commandQueue(
          createExecutePacket(response, args),
          new ReassemblerPSResultSet(),
          true
        ).then((data) => {
          this.#commandQueue(createClosePacket(response.statementId), false);

          return data;
        });
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
    return this.queryDetailed(sql, args)
      .catch((error) => {
        throw new QueryError("query error", { cause: error });
      })
      .then((result) => {
        if (
          result instanceof PacketResultSet ||
          result instanceof PreparedStatementResultSet
        ) {
          return result.getRows<T>();
        }

        throw new QueryError("unexpected query response type", {
          cause: result,
        });
      });
  }

  public async execute(sql: string, args?: ExecuteArgument[]) {
    return this.queryDetailed(sql, args)
      .catch((error) => {
        throw new ExecuteError("query error", { cause: error });
      })
      .then((response) => {
        if (response instanceof PacketOk) {
          return response;
        }

        throw new ExecuteError("unexpected query response type", {
          cause: response,
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

  public async reset() {
    return this.#commandQueue(Buffer.from([0x1f]));
  }

  async #commandQueue(
    buffer: Buffer,
    reassembler: Reassembler | false | undefined = undefined,
    priority = false,
    sequence = 0
  ) {
    return new Promise<PacketType>((resolve, reject) => {
      const command = new ConnectionCommand(
        buffer,
        resolve,
        reject,
        reassembler,
        sequence
      );

      if (priority) {
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
    if (command.reassembler === false) {
      this.#socket.write(createPacket(command.buffer, command.sequence));

      return undefined;
    }

    return new Promise<void>((resolve) => {
      const reassembler = new PacketReassembler((data) => {
        this.#socket.off("data", reassemblerPush);

        if (data instanceof PacketError) {
          command.reject(data);
        } else {
          command.resolve(data);
        }

        resolve();
      }, command.reassembler as Exclude<typeof command.reassembler, false>);

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
      this.#options,
      0xffffffff
    );

    this.#send(
      new ConnectionCommand(
        handshakeResponse,
        () => {
          this.status = Status.READY;
          this.emit("authenticated", this);

          if (this.#options.afterAuthenticated) {
            const queuedCommands = this.#commands;

            this.#commands = [];
            this.#options.afterAuthenticated.call(this);
            this.#wasUsed = false;
            this.#commands.push(...queuedCommands);
          }

          this.#commandRun();
        },
        (response) => {
          this.status = Status.ERROR;
          this.emit("error", this, response);
          this.close();
        },
        undefined,
        1
      )
    );
  }
}
