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

export class PacketReassembler {
  #packetIncomplete: Buffer | undefined = undefined;

  #reassemblerValidated: boolean | undefined = undefined;

  readonly #onDoneCallback: OnDoneCallback;

  readonly #reassembler?: Reassembler | undefined;

  readonly #results: Array<PacketError | PacketType> = [];

  public constructor(
    onDoneCallback: OnDoneCallback,
    reassembler?: Reassembler | undefined
  ) {
    this.#onDoneCallback = onDoneCallback;
    this.#reassembler = reassembler;
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

      if (this.#reassembler) {
        if (this.#reassemblerValidated === undefined) {
          this.#reassemblerValidated = this.#reassembler.is(payload);
        }

        if (this.#reassemblerValidated) {
          const pushStatus = this.#reassembler.push(payload);

          if (pushStatus === PushRecommendation.EOF_THEN_REPEAT) {
            this.#results.push(this.#reassembler.get());

            continue;
          } else if (pushStatus === PushRecommendation.EOF) {
            this.#results.push(this.#reassembler.get());
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
