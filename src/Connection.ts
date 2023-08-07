/* eslint-disable unicorn/prefer-event-target */
import { Socket } from "node:net";

import { ConnectionException } from "@/Exceptions/ConnectionException";
import { type Exception } from "@/Exceptions/Exception";
import { FewArgumentsException } from "@/Exceptions/FewArgumentsException";
import { QueryException } from "@/Exceptions/QueryException";
import { TooManyArgumentsException } from "@/Exceptions/TooManyArgumentsException";
import {
  expectedOKPacket,
  expectedResultSetPacket,
} from "@/Exceptions/UnexpectedResponseTypeException";
import { Handshake } from "@/Protocol/Handshake/Handshake";
import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse";
import { createPacket } from "@/Protocol/Packet/Packet";
import { type PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet, type Row } from "@/Protocol/Packet/PacketResultSet";
import {
  PacketReassembler,
  type PacketType,
} from "@/Protocol/PacketReassembler/PacketReassembler";
import { type Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler";
import { ReassemblerPreparedStatementResponse } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResponse";
import { ReassemblerPreparedStatementResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResultSet";
import { ReassemblerResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet";
import {
  createClosePacket,
  createExecutePacket,
  type ExecuteArgument,
} from "@/Protocol/PreparedStatement/PreparedStatement";
import { type PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";
import { EventEmitter } from "@/Utils/EventEmitter";
import { type Awaitable } from "@/Utils/TypesUtil";

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
  afterAuthenticated?(this: Connection): Awaitable<void>;
}

type ConnectionEventsError = "error";

type ConnectionEventsCommon =
  | "authenticated"
  | "authenticating"
  | "closed"
  | "connected";

const enum CommandLock {
  FREE,
  LOCK,
  RELEASE,
}

class ConnectionCommand {
  public constructor(
    public readonly buffer: Buffer,
    public resolve: (data: Array<PacketError | PacketType>) => void,
    public reject: (error: PacketError, packets: PacketType[]) => void,
    public reassembler: typeof Reassembler | false | undefined,
    public sequence: number,
    public lock = CommandLock.FREE,
  ) {}
}

type Transaction = ConnectionCommand[];

abstract class ConnectionEvents {
  readonly #eventsEmitter = new EventEmitter();

  public on(
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Exception) => void,
  ): void;

  public on(
    eventName: ConnectionEventsCommon,
    listener: (connection: Connection) => void,
  ): void;

  public on(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void,
  ): void {
    this.#eventsEmitter.on(eventName, listener);
  }

  public once(
    eventName: ConnectionEventsError,
    listener: (connection: Connection, error: Exception) => void,
  ): void;

  public once(
    eventName: ConnectionEventsCommon,
    listener: (connection: Connection) => void,
  ): void;

  public once(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void,
  ): void {
    this.#eventsEmitter.once(eventName, listener);
  }

  public emit(
    eventName: ConnectionEventsCommon | ConnectionEventsError,
    ...args: unknown[]
  ): void {
    this.#eventsEmitter.emit(eventName, ...args);
  }
}

export class Connection extends ConnectionEvents {
  public status: Status = Status.CONNECTING;

  #lock = CommandLock.FREE;

  #connected = false;

  #transactionsCommands: Transaction[] = [[]];

  readonly #socket: Socket;

  readonly #options: ConnectionOptions;

  #wasUsed = false;

  public constructor(
    options: Partial<ConnectionOptions> & Pick<ConnectionOptions, "database">,
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

    socket.once("error", (error) => {
      this.status = Status.ERROR;
      this.emit("error", this, error);
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

  private get currentTransactionCommands(): Transaction {
    return this.#transactionsCommands.at(-1)!;
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
    return this.#commandQueue(Buffer.from([0x0e])).then(([packet]) => packet);
  }

  public async queryRaw(sql: string, args?: ExecuteArgument[]) {
    if (args !== undefined && args.length > 0) {
      if (args.length > 0xff_ff) {
        throw new TooManyArgumentsException(
          `Prepared Statements supports only ${0xff_ff} arguments`,
        );
      }

      return this.#commandQueue(
        Buffer.concat([Buffer.from([0x16]), Buffer.from(sql)]),
        ReassemblerPreparedStatementResponse,
        0,
        CommandLock.LOCK,
      )
        .catch((packetError: PacketError) => {
          throw new QueryException(packetError.message).setDetails(
            packetError.code,
            { packetError },
          );
        })
        .then(async ([packet]) => {
          const response = packet as PreparedStatementResponse;

          if (response.parametersCount > args.length) {
            void this.#commandQueue(
              createClosePacket(response.statementId),
              false,
            );

            throw new FewArgumentsException(
              `Prepared Statement number of arguments is ${response.parametersCount}, but received ${args.length}`,
            ).setDetails(undefined, {
              required: response.parametersCount,
              received: args.length,
            });
          }

          return this.#commandQueue(
            createExecutePacket(response, args),
            ReassemblerPreparedStatementResultSet,
            0,
            CommandLock.RELEASE,
          ).then(([data]) => {
            void this.#commandQueue(
              createClosePacket(response.statementId),
              false,
            );

            return data;
          });
        });
    }

    return this.batchQueryRaw(sql)
      .catch((packetError: PacketError) => {
        throw new QueryException(packetError.message).setDetails(
          packetError.code,
          { packetError },
        );
      })
      .then(([packet]) => packet);
  }

  public async query<T extends object = Row>(
    sql: string,
    args?: ExecuteArgument[],
  ) {
    return this.queryRaw(sql, args).then((result) => {
      if (
        result instanceof PacketResultSet ||
        result instanceof PreparedStatementResultSet
      ) {
        return result.getRows<T>();
      }

      throw expectedResultSetPacket(result!);
    });
  }

  public async execute(sql: string, args?: ExecuteArgument[]) {
    return this.queryRaw(sql, args)
      .catch((packetError: PacketError) => {
        throw new QueryException(packetError.message).setDetails(
          packetError.code,
          { packetError },
        );
      })
      .then((response) => {
        if (response instanceof PacketOk) {
          return response;
        }

        throw expectedOKPacket(response!);
      });
  }

  public async batchQueryRaw(sql: string) {
    return this.#commandQueue(
      Buffer.concat([Buffer.from([0x03]), Buffer.from(sql)]),
      ReassemblerResultSet,
    );
  }

  public async batchQuery<T extends object = Row>(sql: string) {
    return this.batchQueryRaw(sql)
      .catch((packetError: PacketError) => {
        throw new QueryException(packetError.message).setDetails(
          packetError.code,
          { packetError },
        );
      })
      .then((packets) =>
        packets.map((packet) => {
          if (packet instanceof PacketResultSet) {
            return packet.getRows<T>();
          }

          throw expectedResultSetPacket(packet);
        }),
      );
  }

  public async batchExecute(sql: string) {
    return this.batchQueryRaw(sql)
      .catch((packetError: PacketError) => {
        throw new QueryException(packetError.message).setDetails(
          packetError.code,
          { packetError },
        );
      })
      .then((packets) =>
        packets.map((packet) => {
          if (packet instanceof PacketOk) {
            return packet;
          }

          throw expectedOKPacket(packet);
        }),
      );
  }

  public async transaction(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    callback: () => Awaitable<boolean | void>,
  ): Promise<void> {
    this.#transactionsCommands.push([]);

    await this.execute("START TRANSACTION");

    try {
      const result = await callback();

      await this.execute(result === false ? "ROLLBACK" : "COMMIT");
    } catch {
      await this.execute("ROLLBACK");
    }

    this.#transactionsCommands.pop();
  }

  public async close(): Promise<void> {
    if (!this.#connected) {
      this.#socket.end();

      return undefined;
    }

    return new Promise((resolve) => {
      this.#socket.once("end", resolve);
      void this.#commandQueue(Buffer.from([0x01]));
    });
  }

  public async reset() {
    return this.#commandQueue(Buffer.from([0x1f])).then(([packet]) => packet);
  }

  async #commandQueue(
    buffer: Buffer,
    reassembler?: typeof Reassembler | false | undefined,
    sequence = 0,
    lock = CommandLock.FREE,
  ) {
    return new Promise<Array<PacketError | PacketType>>((resolve, reject) => {
      const command = new ConnectionCommand(
        buffer,
        resolve,
        reject,
        reassembler,
        sequence,
        lock,
      );

      if (lock !== CommandLock.FREE && this.#lock === CommandLock.LOCK) {
        this.#commandRunImmediately(command);
      } else {
        this.currentTransactionCommands.push(command);
        this.#commandRun();
      }
    });
  }

  #commandRun() {
    if (this.status !== Status.READY) {
      return;
    }

    const command = this.currentTransactionCommands.shift();

    if (!command) {
      return;
    }

    this.#commandRunImmediately(command);
  }

  #commandRunImmediately(command: ConnectionCommand) {
    if (command.lock === CommandLock.LOCK) {
      this.#lock = CommandLock.LOCK;
    }

    this.status = Status.EXECUTING;
    this.#wasUsed = true;

    // eslint-disable-next-line promise/catch-or-return
    void this.#send(command).finally(() => {
      this.status = Status.READY;

      if (command.lock === CommandLock.RELEASE) {
        this.#lock = CommandLock.FREE;
      }

      if (command.lock !== CommandLock.LOCK) {
        this.#commandRun();
      }
    });
  }

  async #send(command: ConnectionCommand) {
    if (command.reassembler === false) {
      this.#socket.write(createPacket(command.buffer, command.sequence));

      return;
    }

    return new Promise<void>((resolve) => {
      const reassembler = new PacketReassembler(
        (packets, error) => {
          this.#socket.off("data", reassemblerPush);

          if (error === undefined) {
            command.resolve(packets);
          } else {
            command.reject(error, packets);
          }

          resolve();
        },
        command.reassembler as ConstructorParameters<
          typeof PacketReassembler
        >[1],
      );

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
      0xff_ff_ff_ff,
    );

    void this.#send(
      new ConnectionCommand(
        handshakeResponse,
        async () => {
          this.status = Status.READY;
          this.emit("authenticated", this);

          if (this.#options.afterAuthenticated) {
            const queuedCommands = this.#transactionsCommands;

            this.#transactionsCommands = [[]];
            await this.#options.afterAuthenticated.call(this);
            this.#wasUsed = false;
            this.#transactionsCommands.push(...queuedCommands);
          }

          this.#commandRun();
        },
        (packetError) => {
          this.status = Status.ERROR;
          this.emit(
            "error",
            this,
            new ConnectionException(packetError.message).setDetails(
              packetError.code,
              { packetError },
            ),
          );

          void this.close();
        },
        undefined,
        1,
      ),
    );
  }
}
