import { FieldTypes, FieldTypesGrouped } from "@/Protocol/Enumerations";
import { BufferConsumer } from "@/Utils/BufferConsumer";

interface FieldMetadata {
  type: number;
  name: string;
  collation: number;
  flags: number;
  decimals: number;
}

type Row = Array<Buffer | null>;

type RowTransformed = Record<string, Buffer | bigint | number | string | null>;

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

      if (column.type === FieldTypes.LONGLONG) {
        rowTransformed[column.name] = BigInt(cell!.toString());
      } else if (FieldTypesGrouped.NUMBER.includes(column.type)) {
        rowTransformed[column.name] = Number(cell!);
      } else if (FieldTypesGrouped.BLOB.includes(column.type)) {
        rowTransformed[column.name] = cell!;
      } else if (FieldTypesGrouped.STRING.includes(column.type)) {
        rowTransformed[column.name] = cell!.toString();
      } else {
        rowTransformed[column.name] = null;
      }
    }

    return rowTransformed;
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
          collation: this.bufferConsumer.skipStringEncoded().skip(1).readInt(2),
          type: this.bufferConsumer.skip(4).readInt(),
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
