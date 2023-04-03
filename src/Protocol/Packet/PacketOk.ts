import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketOk {
  public affectedRows: number;

  public lastInsertId: number;

  public serverStatus: number;

  public warningCount: number;

  public constructor(packet: Buffer) {
    const bufferConsumer = new BufferConsumer(packet);

    this.affectedRows = Number(bufferConsumer.readIntEncoded());
    this.lastInsertId = Number(bufferConsumer.readIntEncoded());
    this.serverStatus = bufferConsumer.readUInt(2);
    this.warningCount = bufferConsumer.readUInt(2);
  }
}
