import { readField, type Field } from "@/Protocol/Data/Field";
import { FieldFlags, FieldTypes } from "@/Protocol/Enumerations";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { BufferConsumer } from "@/Utils/BufferConsumer";
import { toNumber } from "@/Utils/NumberUtil";

export class PreparedStatementResultSet {
  public fieldsCount: number;

  #fields: Field[] | undefined;

  readonly #bufferConsumer: BufferConsumer;

  public constructor(buffer: Buffer) {
    this.#bufferConsumer = new BufferConsumer(buffer);
    this.fieldsCount = Number(this.#bufferConsumer.readIntEncoded());
  }

  public getFields() {
    if (this.#fields === undefined) {
      this.#fields = [];

      for (let i = 0; i < this.fieldsCount; i++) {
        this.#fields.push(readField(this.#bufferConsumer));
      }
    }

    return this.#fields;
  }

  public *getRows<T extends object = Row>() {
    const fields = this.getFields();
    const fieldsLength = fields.length;

    while (!this.#bufferConsumer.consumed()) {
      // Skip Header OK (0x00) and Null Bitmap.
      this.#bufferConsumer.skip(1 + Math.floor((this.fieldsCount + 7) / 8));

      const row: Row = {};

      for (let i = 0; i < fieldsLength; i++) {
        const field = fields[i]!;

        switch (field.type) {
          case FieldTypes.NULL:
            row[field.name] = null;
            break;

          case FieldTypes.INT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === FieldFlags.UNSIGNED
                ? this.#bufferConsumer.readUInt(4)
                : this.#bufferConsumer.readInt(4);
            break;

          case FieldTypes.SMALLINT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === FieldFlags.UNSIGNED
                ? this.#bufferConsumer.readUInt(2)
                : this.#bufferConsumer.readInt(2);
            break;

          case FieldTypes.TINYINT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === FieldFlags.UNSIGNED
                ? this.#bufferConsumer.readUInt()
                : this.#bufferConsumer.readInt();
            break;

          case FieldTypes.DECIMAL:
            row[field.name] = toNumber(
              this.#bufferConsumer.readStringEncoded()!.toString()
            )!;
            break;

          case FieldTypes.VARCHAR:
            row[field.name] = this.#bufferConsumer
              .readStringEncoded()!
              .toString();
            break;

          case FieldTypes.BLOB:
          case FieldTypes.LONGBLOB:
            row[field.name] = this.#bufferConsumer.readStringEncoded();
            break;

          case FieldTypes.BIGINT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === FieldFlags.UNSIGNED
                ? this.#bufferConsumer.readUBigInt()
                : this.#bufferConsumer.readBigInt();
            break;

          case FieldTypes.DATETIME:
            row[field.name] = this.#bufferConsumer.readDatetimeEncoded();
            break;

          case FieldTypes.TIME:
            row[field.name] = this.#bufferConsumer.readTimeEncoded();
            break;

          default: // empty
        }
      }

      yield row as T;
    }
  }
}
