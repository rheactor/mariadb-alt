import { readField, type Field } from "@/Protocol/Data/Field";
import { FieldFlags, FieldTypes } from "@/Protocol/Enumerations";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PreparedStatementResultSet {
  public fieldsCount: number;

  private fields: Field[] | undefined;

  private readonly bufferConsumer: BufferConsumer;

  public constructor(buffer: Buffer) {
    this.bufferConsumer = new BufferConsumer(buffer);
    this.fieldsCount = Number(this.bufferConsumer.skip(4).readIntEncoded());
  }

  public getFields() {
    if (this.fields === undefined) {
      this.fields = [];

      for (let i = 0; i < this.fieldsCount; i++) {
        this.fields.push(readField(this.bufferConsumer));
      }
    }

    return this.fields;
  }

  public *getRows() {
    const fields = this.getFields();
    const fieldsLength = fields.length;

    while (this.bufferConsumer.at(4) !== 0xfe) {
      this.bufferConsumer.skip(5); // header
      this.bufferConsumer.skip(Math.floor((this.fieldsCount + 7) / 8)); // Null Bitmap

      const row: Row = {};

      for (let i = 0; i < fieldsLength; i++) {
        const field = fields[i]!;

        switch (field.type) {
          case FieldTypes.NULL:
            row[field.name] = null;
            break;

          case FieldTypes.INT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === 0
                ? this.bufferConsumer.readUInt(4)
                : this.bufferConsumer.readInt(4);
            break;
          case FieldTypes.DECIMAL:
            row[field.name] = Number(
              this.bufferConsumer.readStringEncoded()!.toString()
            );
            break;

          case FieldTypes.VARCHAR:
            row[field.name] = this.bufferConsumer
              .readStringEncoded()!
              .toString();
            break;

          case FieldTypes.BLOB:
            row[field.name] = this.bufferConsumer.readStringEncoded();
            break;

          case FieldTypes.BIGINT:
            row[field.name] =
              (field.flags & FieldFlags.UNSIGNED) === 0
                ? this.bufferConsumer.readUBigInt()
                : this.bufferConsumer.readBigInt();
            break;

          case FieldTypes.DATETIME:
            row[field.name] = this.bufferConsumer.readDatetimeEncoded();
            break;

          case FieldTypes.TIME:
            row[field.name] = this.bufferConsumer.readTimeEncoded();
            break;

          default: // empty
        }
      }

      yield row;
    }
  }
}
