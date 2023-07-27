import { PacketError } from "@/Protocol/Packet/PacketError";
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

const enum ReassemblerValidation {
  // Reassembler not was checked by validation using .is().
  PENDING,

  // Reassembler has checked, but packet is incompatible (probably is PacketOK or PacketError).
  INCOMPATIBLE,

  // Reassembler has checked and is compatible packet.
  ACCEPTED,
}

type OnDoneCallback = (packets: PacketType[], error?: PacketError) => void;

type Constructor<T> = new () => T;

export class PacketReassembler {
  #packetIncomplete: Buffer | undefined = undefined;

  #reassemblerValidation = ReassemblerValidation.PENDING;

  readonly #onDoneCallback: OnDoneCallback;

  readonly #reassembler?: Constructor<Reassembler> | undefined = undefined;

  #reassemblerInstance?: Reassembler | undefined = undefined;

  readonly #results: PacketType[] = [];

  public constructor(
    onDoneCallback: OnDoneCallback,
    reassembler?: Constructor<Reassembler> | undefined,
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
        PAYLOAD_LENGTH,
      );
      const packetLength = payloadLength + HEADER_SIZE;

      if (this.#packetIncomplete.length < packetLength) {
        break;
      }

      const payload = this.#packetIncomplete.subarray(
        HEADER_SIZE,
        packetLength,
      );

      if (this.#reassemblerInstance) {
        if (this.#reassemblerValidation === ReassemblerValidation.PENDING) {
          this.#reassemblerValidation = this.#reassemblerInstance.is(payload)
            ? ReassemblerValidation.ACCEPTED
            : ReassemblerValidation.INCOMPATIBLE;
        }

        if (this.#reassemblerValidation === ReassemblerValidation.ACCEPTED) {
          const pushStatus = this.#reassemblerInstance.push(payload);

          if (pushStatus === PushRecommendation.MORE_RESULTS) {
            this.#results.push(this.#reassemblerInstance.get());
            this.#reassemblerValidation = ReassemblerValidation.PENDING;
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
        this.#onDoneCallback(
          this.#results,
          PacketError.from(payload.subarray(1)),
        );

        return;
      }

      // Packet OK:
      if (PacketOk.is(payload)) {
        const packetOk = PacketOk.from(payload.subarray(1));

        this.#results.push(packetOk);

        if (packetOk.hasMoreResults()) {
          this.#reassemblerValidation = ReassemblerValidation.PENDING;
          this.#packetIncomplete =
            this.#packetIncomplete.subarray(packetLength);

          continue;
        }

        this.#onDoneCallback(this.#results);

        return;
      }

      throw new Error("malformed packet");
    }
  }
}
