import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { FieldFlags, FieldTypes } from "@/Protocol/Enumerations";
import { BufferConsumer } from "@/Utils/BufferConsumer";

interface ExtendedMetadata {
  json: boolean;
  uuid: boolean;
}

export interface FieldMetadata extends ExtendedMetadata {
  type: number;
  name: string;
  collation: number;
  flags: number;
  length: number;
  decimals: number;
}

type Row = Array<Buffer | null>;

type RowTransformed = Record<
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
  private readonly bufferConsumer: BufferConsumer;

  private fields: FieldMetadata[] | undefined;

  public constructor(buffer: Buffer) {
    this.bufferConsumer = new BufferConsumer(buffer);
  }

  public static transform(row: Row, metadata: FieldMetadata[]): RowTransformed {
    const rowTransformed: RowTransformed = {};
    const metadataLength = metadata.length;

    for (let i = 0; i < metadataLength; i++) {
      const column = metadata[i]!;
      const cell = row[i];

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
        case FieldTypes.FLOAT:
          rowTransformed[column.name] = Number(cell!);
          break;

        case FieldTypes.BIGINT:
          rowTransformed[column.name] = BigInt(cell!.toString());
          break;

        case FieldTypes.DATETIME:
        case FieldTypes.TIMESTAMP:
          rowTransformed[column.name] = new DateTimeFormat(cell!.toString());
          break;

        case FieldTypes.VARCHAR:
          rowTransformed[column.name] = cell!.toString();
          break;

        case FieldTypes.CHAR:
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

        case FieldTypes.DATE:
          rowTransformed[column.name] = new DateFormat(cell!.toString());
          break;

        case FieldTypes.TIME:
          rowTransformed[column.name] = new TimeFormat(cell!.toString());
          break;

        case FieldTypes.YEAR:
          if (column.length === 2) {
            const year = Number(cell!.toString());

            rowTransformed[column.name] =
              year >= 70 ? 1900 + year : 2000 + year;
          } else {
            rowTransformed[column.name] = Number(cell!.toString());
          }
          break;

        case FieldTypes.BLOB:
          rowTransformed[column.name] = column.json
            ? JSON.parse(cell!.toString())
            : cell!;
          break;

        case FieldTypes.BIT:
          if (column.length === 1) {
            rowTransformed[column.name] = Boolean(cell!.readIntBE(0, 1));
          } else if (column.length > 32) {
            rowTransformed[column.name] = BigInt(`0x${cell!.toString("hex")}`);
          } else {
            rowTransformed[column.name] = cell!.readIntBE(0, cell!.length);
          }
          break;

        default: // empty
      }
    }

    return rowTransformed;
  }

  private static getExtendedMetadata(
    bufferConsumer: BufferConsumer
  ): ExtendedMetadata {
    const extendedMetadataLength = bufferConsumer.readIntEncoded();
    const extendedMetadata: ExtendedMetadata = { json: false, uuid: false };

    if (extendedMetadataLength === 0) {
      return extendedMetadata;
    }

    const extendedBuffer = new BufferConsumer(
      bufferConsumer.slice(Number(extendedMetadataLength))
    );

    while (!extendedBuffer.consumed()) {
      const dataType = extendedBuffer.readInt();
      const dataValue = extendedBuffer.readStringEncoded()!.toString();

      if (dataType === 1 && dataValue === "json") {
        extendedMetadata.json = true;
      } else if (dataType === 0 && dataValue === "uuid") {
        extendedMetadata.uuid = true;
      }
    }

    return extendedMetadata;
  }

  public getMetadata() {
    if (this.fields === undefined) {
      this.fields = [];

      const fieldsCount = Number(this.bufferConsumer.readIntEncoded());

      for (let i = 0; i < fieldsCount; i++) {
        this.bufferConsumer
          .skip(8) // header + catalog
          .skipStringEncoded() // database
          .skipStringEncoded() // table alias
          .skipStringEncoded(); // table

        this.fields.push({
          name: this.bufferConsumer.readStringEncoded()!.toString(),
          ...PacketResultSet.getExtendedMetadata(
            this.bufferConsumer.skipStringEncoded()
          ),
          collation: this.bufferConsumer.skip(1).readInt(2),
          length: this.bufferConsumer.readInt(4),
          type: this.bufferConsumer.readInt(),
          flags: this.bufferConsumer.readInt(2),
          decimals: this.bufferConsumer.readInt(),
        });

        this.bufferConsumer.skip(2);
      }
    }

    return this.fields;
  }

  public *getRows() {
    const metadata = this.fields ?? this.getMetadata();
    const metadataLength = metadata.length;

    while (this.bufferConsumer.at(4) !== 0xfe) {
      this.bufferConsumer.skip(4); // header

      const row: Row = [];

      for (let i = 0; i < metadataLength; i++) {
        row.push(this.bufferConsumer.readStringEncoded());
      }

      yield row;
    }
  }
}
