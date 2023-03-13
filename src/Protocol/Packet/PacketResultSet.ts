import { FieldTypes } from "@/Protocol/Enumerations";
import { BufferConsumer } from "@/Utils/BufferConsumer";

export class FieldMetadata {
  public constructor(
    public database: Buffer | null,
    public tableAlias: Buffer | null,
    public table: Buffer | null,
    public columnAlias: Buffer | null,
    public column: Buffer | null,
    public collation: number,
    public length: number,
    public type: number,
    public flags: number,
    public decimals: number
  ) {}

  public isBigInt() {
    return this.type === FieldTypes.LONGLONG;
  }

  public isInt() {
    return (
      this.type === FieldTypes.LONG ||
      this.type === FieldTypes.SHORT ||
      this.type === FieldTypes.TINY ||
      this.type === FieldTypes.DECIMAL ||
      this.type === FieldTypes.NEWDECIMAL ||
      this.type === FieldTypes.DOUBLE ||
      this.type === FieldTypes.FLOAT ||
      this.type === FieldTypes.INT24
    );
  }
}

type RowValue = bigint | number | string | null;

export class PacketResultSet {
  public fields: FieldMetadata[] = [];

  public rows: RowValue[][] = [];

  public constructor(buffer: Buffer) {
    const bufferConsumer = new BufferConsumer(buffer);

    const fieldsCount = Number(bufferConsumer.readIntEncoded());

    for (let i = 0; i < fieldsCount; i++) {
      bufferConsumer.skip(8); // header + catalog

      this.fields.push(
        new FieldMetadata(
          bufferConsumer.readStringEncoded(),
          bufferConsumer.readStringEncoded(),
          bufferConsumer.readStringEncoded(),
          bufferConsumer.readStringEncoded(),
          bufferConsumer.readStringEncoded(),
          bufferConsumer.skip().readInt(2),
          bufferConsumer.readInt(4),
          bufferConsumer.readInt(),
          bufferConsumer.readInt(2),
          bufferConsumer.readInt()
        )
      );

      bufferConsumer.skip(2);
    }

    for (;;) {
      bufferConsumer.skip(4); // header

      if (bufferConsumer.readInt() === 0xfe) {
        break;
      }

      bufferConsumer.skip(-1);

      const row: RowValue[] = [];

      for (let i = 0; i < fieldsCount; i++) {
        const rowDecoded = bufferConsumer.readStringEncoded();

        if (rowDecoded === null) {
          row.push(null);
        } else {
          const rowString = rowDecoded.toString("binary");
          const fieldMetadata = this.fields[i]!;

          if (fieldMetadata.isInt()) {
            row.push(Number(rowString));
          } else if (fieldMetadata.isBigInt()) {
            row.push(BigInt(rowString));
          } else {
            row.push(rowString);
          }
        }
      }

      this.rows.push(row);
    }
  }
}
