import { PacketError } from "@/Errors/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { type PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import {
  PushRecommendation,
  type Reassembler,
} from "@/Protocol/PacketReassembler/Reassembler/Reassembler";
import { type PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { type PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";

const PAYLOAD_LENGTH = 3;
const SEQUENCE_LENGTH = 1;
const HEADER_SIZE = PAYLOAD_LENGTH + SEQUENCE_LENGTH;

export type PacketType =
  | PacketOk
  | PacketResultSet
  | PreparedStatementResponse
  | PreparedStatementResultSet;

type OnDoneCallback = (packets: Array<PacketError | PacketType>) => void;

type Constructor<T> = new () => T;

export class PacketReassembler {
  #packetIncomplete: Buffer | undefined = undefined;

  #reassemblerValidated: boolean | undefined = undefined;

  readonly #onDoneCallback: OnDoneCallback;

  readonly #reassembler?: Constructor<Reassembler> | undefined = undefined;

  #reassemblerInstance?: Reassembler | undefined = undefined;

  readonly #results: Array<PacketError | PacketType> = [];

  public constructor(
    onDoneCallback: OnDoneCallback,
    reassembler?: Constructor<Reassembler> | undefined
  ) {
    this.#onDoneCallback = onDoneCallback;

    if (reassembler !== undefined) {
      this.#reassembler = reassembler;
      this.#reassemblerInstance = new reassembler();
    }
  }

  public push(buffer: Buffer) {
    this.#packetIncomplete =
      this.#packetIncomplete === undefined
        ? buffer
        : Buffer.concat([this.#packetIncomplete, buffer]);

    while (this.#packetIncomplete.length >= HEADER_SIZE) {
      const payloadLength = this.#packetIncomplete.readUIntLE(
        0,
        PAYLOAD_LENGTH
      );
      const packetLength = payloadLength + HEADER_SIZE;

      if (this.#packetIncomplete.length < packetLength) {
        break;
      }

      const payload = this.#packetIncomplete.subarray(
        HEADER_SIZE,
        packetLength
      );

      if (this.#reassemblerInstance) {
        if (this.#reassemblerValidated === undefined) {
          this.#reassemblerValidated = this.#reassemblerInstance.is(payload);
        }

        if (this.#reassemblerValidated) {
          const pushStatus = this.#reassemblerInstance.push(payload);

          if (pushStatus === PushRecommendation.MORE_RESULTS) {
            this.#results.push(this.#reassemblerInstance.get());
            this.#reassemblerValidated = undefined;
            this.#reassemblerInstance = new this.#reassembler!();
          } else if (pushStatus === PushRecommendation.DONE) {
            this.#results.push(this.#reassemblerInstance.get());
            this.#onDoneCallback(this.#results);

            return;
          }

          this.#packetIncomplete =
            this.#packetIncomplete.subarray(packetLength);

          continue;
        }
      }

      // Packet Error:
      if (PacketError.is(payload)) {
        this.#results.push(PacketError.from(payload.subarray(1)));
        this.#onDoneCallback(this.#results);

        return;
      }

      // Packet OK:
      if (PacketOk.is(payload)) {
        this.#results.push(PacketOk.from(payload.subarray(1)));
        this.#onDoneCallback(this.#results);

        return;
      }

      throw new Error("malformed packet");
    }
  }
}
