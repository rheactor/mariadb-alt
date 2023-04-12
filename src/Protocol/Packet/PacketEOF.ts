import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketEOF {
  public readonly serverStatus: number;

  public readonly warningCount: number;

  public constructor(packet: Buffer) {
    const bufferConsumer = new BufferConsumer(packet);

    this.warningCount = bufferConsumer.readUInt(2);
    this.serverStatus = bufferConsumer.readUInt(2);
  }
}
