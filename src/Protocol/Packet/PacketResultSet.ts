import { BufferConsumer } from "@/Utils/BufferConsumer";

enum FieldType {
  STRING,
  NUMBER,
  BIGINT,
}

interface FieldMetadata {
  type: FieldType;
  name: string;
  collation: number;
  flags: number;
  decimals: number;
}

type Row = Record<string, string | null>;

export class PacketResultSet {
  private readonly bufferConsumer: BufferConsumer;

  private fields: FieldMetadata[] | undefined;

  public constructor(buffer: Buffer) {
    this.bufferConsumer = new BufferConsumer(buffer);
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

    while (this.bufferConsumer.at(4) !== 0xfe) {
      this.bufferConsumer.skip(4); // header

      const row: Row = {};

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < metadata.length; i++) {
        const cell = this.bufferConsumer.readStringEncoded();

        row[metadata[i]!.name] = cell ? cell.toString() : null;
      }

      yield row;
    }
  }
}
