import { DateFormat } from "@/Formats/DateFormat.js";
import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import type { Field } from "@/Protocol/Data/Field.js";
import { readField } from "@/Protocol/Data/Field.js";
import { FieldFlags, FieldTypes } from "@/Protocol/Enumerations.js";
import { BufferConsumer } from "@/Utils/BufferConsumer.js";

type RowUnprocessed = Array<Buffer | null>;

export type Row = Record<
  string,
  | Buffer
  | Date
  | DateFormat
  | DateTimeFormat
  | string[]
  | TimeFormat
  | bigint
  | boolean
  | number
  | string
  | null
>;

export class PacketResultSet {
  readonly #bufferConsumer: BufferConsumer;

  #fields: Field[] | undefined;

  public constructor(buffer: Buffer) {
    this.#bufferConsumer = new BufferConsumer(buffer);
  }

  public static transform(row: RowUnprocessed, fields: Field[]): Row {
    const rowTransformed: Row = {};
    const fieldsLength = fields.length;

    for (let index = 0; index < fieldsLength; index++) {
      const column = fields[index]!;
      const cell = row[index];

      if (cell === null) {
        rowTransformed[column.name] = null;
        continue;
      }

      switch (column.type) {
        case FieldTypes.INT:
        case FieldTypes.DECIMAL:
        case FieldTypes.TINYINT:
        case FieldTypes.SMALLINT:
        case FieldTypes.MEDIUMINT:
        case FieldTypes.DOUBLE:
        case FieldTypes.FLOAT: {
          rowTransformed[column.name] = Number(cell!);
          break;
        }

        case FieldTypes.BIGINT: {
          rowTransformed[column.name] = BigInt(cell!.toString());
          break;
        }

        case FieldTypes.DATETIME:
        case FieldTypes.TIMESTAMP: {
          rowTransformed[column.name] = DateTimeFormat.parse(cell!.toString());
          break;
        }

        case FieldTypes.VARCHAR: {
          rowTransformed[column.name] = cell!.toString();
          break;
        }

        case FieldTypes.CHAR: {
          {
            const value = cell!.toString();

            rowTransformed[column.name] =
              (column.flags & FieldFlags.SET) === FieldFlags.SET
                ? value === ""
                  ? []
                  : value.split(",")
                : value;
          }
          break;
        }

        case FieldTypes.DATE: {
          rowTransformed[column.name] = DateFormat.parse(cell!.toString());
          break;
        }

        case FieldTypes.TIME: {
          rowTransformed[column.name] = TimeFormat.parse(cell!.toString());
          break;
        }

        case FieldTypes.YEAR: {
          if (column.length === 2) {
            const year = Number(cell!.toString());

            rowTransformed[column.name] =
              year >= 70 ? 1900 + year : 2000 + year;
          } else {
            rowTransformed[column.name] = Number(cell!.toString());
          }
          break;
        }

        case FieldTypes.BLOB:
        case FieldTypes.LONGBLOB: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          rowTransformed[column.name] = column.json
            ? JSON.parse(cell!.toString())
            : cell!;
          break;
        }

        case FieldTypes.BIT: {
          if (column.length === 1) {
            rowTransformed[column.name] = Boolean(cell!.readIntBE(0, 1));
          } else if (column.length > 32) {
            rowTransformed[column.name] = BigInt(`0x${cell!.toString("hex")}`);
          } else {
            rowTransformed[column.name] = cell!.readIntBE(0, cell!.length);
          }
          break;
        }

        default: // empty
      }
    }

    return rowTransformed;
  }

  public getFields() {
    if (this.#fields === undefined) {
      this.#fields = [];

      const fieldsCount = Number(this.#bufferConsumer.readIntEncoded());

      for (let index = 0; index < fieldsCount; index++) {
        this.#fields.push(readField(this.#bufferConsumer));
      }
    }

    return this.#fields;
  }

  public *getRowsUnprocessed() {
    const fields = this.getFields();
    const fieldsLength = fields.length;

    while (!this.#bufferConsumer.consumed()) {
      const row: RowUnprocessed = [];

      for (let index = 0; index < fieldsLength; index++) {
        row.push(this.#bufferConsumer.readStringEncoded());
      }

      yield row;
    }
  }

  public *getRows<T extends object = Row>() {
    for (const row of this.getRowsUnprocessed()) {
      yield PacketResultSet.transform(row, this.#fields!) as T;
    }
  }
}
