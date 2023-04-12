import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketOk {
  public readonly affectedRows: number;

  public readonly lastInsertId: number;

  public readonly serverStatus: number;

  public readonly warningCount: number;

  public constructor(packet: Buffer) {
    const bufferConsumer = new BufferConsumer(packet);

    this.affectedRows = Number(bufferConsumer.readIntEncoded());
    this.lastInsertId = Number(bufferConsumer.readIntEncoded());
    this.serverStatus = bufferConsumer.readUInt(2);
    this.warningCount = bufferConsumer.readUInt(2);
  }
}
