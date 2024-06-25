/* eslint-disable unicorn/prefer-event-target */
import { Socket } from "node:net";

import { ConnectionException } from "@/Exceptions/ConnectionException.js";
import type { Exception } from "@/Exceptions/Exception.js";
import { FewArgumentsException } from "@/Exceptions/FewArgumentsException.js";
import { QueryException } from "@/Exceptions/QueryException.js";
import { TooManyArgumentsException } from "@/Exceptions/TooManyArgumentsException.js";
import {
  expectedOKPacket,
  expectedResultSetPacket,
} from "@/Exceptions/UnexpectedResponseTypeException.js";
import { Handshake } from "@/Protocol/Handshake/Handshake.js";
import { createHandshakeResponse } from "@/Protocol/Handshake/HandshakeResponse.js";
import { createPacket } from "@/Protocol/Packet/Packet.js";
import { PacketError } from "@/Protocol/Packet/PacketError.js";
import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import type { Row } from "@/Protocol/Packet/PacketResultSet.js";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import type { PacketType } from "@/Protocol/PacketReassembler/PacketReassembler.js";
import { PacketReassembler } from "@/Protocol/PacketReassembler/PacketReassembler.js";
import type { Reassembler } from "@/Protocol/PacketReassembler/Reassembler/Reassembler.js";
import { ReassemblerPreparedStatementResponse } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResponse.js";
import { ReassemblerPreparedStatementResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerPreparedStatementResultSet.js";
import { ReassemblerResultSet } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet.js";
import type { ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement.js";
import {
  createClosePacket,
  createExecutePacket,
} from "@/Protocol/PreparedStatement/PreparedStatement.js";
import type { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";
import { EventEmitter } from "@/Utils/EventEmitter.js";
import type { Awaitable } from "@/Utils/TypesUtil.js";

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
          `Prepared Statements supports only 65535 arguments`,
        );
      }

      return this.#commandQueue(
        Buffer.concat([Buffer.from([0x16]), Buffer.from(sql)]),
        ReassemblerPreparedStatementResponse,
        0,
        CommandLock.LOCK,
      )
        .catch((packetError: unknown) => {
          if (packetError instanceof PacketError) {
            throw new QueryException(packetError.message).setDetails(
              packetError.code,
              { packetError },
            );
          }

          throw packetError;
        })
        .then(async ([packet]) => {
          const response = packet as PreparedStatementResponse;

          if (response.parametersCount > args.length) {
            void this.#commandQueue(
              createClosePacket(response.statementId),
              false,
            );

            throw new FewArgumentsException(
              `Prepared Statement number of arguments is ${String(
                response.parametersCount,
              )}, but received ${String(args.length)}`,
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
      .catch((packetError: unknown) => {
        if (packetError instanceof PacketError) {
          throw new QueryException(packetError.message).setDetails(
            packetError.code,
            { packetError },
          );
        }

        throw packetError;
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
      .catch((packetError: unknown) => {
        if (packetError instanceof PacketError) {
          throw new QueryException(packetError.message).setDetails(
            packetError.code,
            { packetError },
          );
        }

        throw packetError;
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
      .catch((packetError: unknown) => {
        if (packetError instanceof PacketError) {
          throw new QueryException(packetError.message).setDetails(
            packetError.code,
            { packetError },
          );
        }

        throw packetError;
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
      .catch((packetError: unknown) => {
        if (packetError instanceof PacketError) {
          throw new QueryException(packetError.message).setDetails(
            packetError.code,
            { packetError },
          );
        }

        throw packetError;
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
    const level = this.#transactionsCommands.push([]) - 2;

    await this.execute(
      level === 0 ? "START TRANSACTION" : `SAVEPOINT n${String(level)}`,
    );

    try {
      const result = await callback();

      await (result === false
        ? this.execute(
            level === 0 ? `ROLLBACK` : `ROLLBACK TO n${String(level)}`,
          )
        : this.execute(
            level === 0 ? "COMMIT" : `RELEASE SAVEPOINT n${String(level)}`,
          ));
    } catch {
      await this.execute(
        level === 0 ? `ROLLBACK` : `ROLLBACK TO n${String(level)}`,
      );
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
