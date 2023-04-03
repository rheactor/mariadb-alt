import { readField, type Field } from "@/Protocol/Data/Field";
import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PreparedStatementResponse {
  public statementId: number;

  public fieldsCount: number;

  public parametersCount: number;

  public warningCount: number;

  public parameters: Field[] | undefined;

  public fields: Field[] | undefined;

  private bufferConsumer: BufferConsumer | undefined;

  public constructor(packet: Buffer) {
    this.bufferConsumer = new BufferConsumer(packet, 5);
    this.statementId = this.bufferConsumer.readUInt(4);
    this.fieldsCount = this.bufferConsumer.readUInt(2);
    this.parametersCount = this.bufferConsumer.readUInt(2);
    this.warningCount = this.bufferConsumer.skip(1).readUInt(2);
  }

  public getParameters(): Field[] {
    if (this.parameters === undefined) {
      this.parameters = [];

      for (let i = 0; i < this.parametersCount; i++) {
        this.parameters.push(readField(this.bufferConsumer!));
      }
    }

    return this.parameters;
  }

  public getFields(): Field[] {
    this.getParameters();

    if (this.fields === undefined) {
      this.fields = [];

      for (let i = 0; i < this.fieldsCount; i++) {
        this.fields.push(readField(this.bufferConsumer!));
      }
    }

    this.bufferConsumer = undefined;

    return this.fields;
  }
}
