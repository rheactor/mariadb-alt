import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketProgress {
  public stage: number;

  public maxStage: number;

  public progress: number;

  public progressInfo: Buffer | null;

  public constructor(packet: Buffer) {
    const bufferConsumer = new BufferConsumer(packet);

    this.stage = bufferConsumer.readUInt();
    this.maxStage = bufferConsumer.readUInt();
    this.progress = bufferConsumer.readUInt(3);
    this.progressInfo = bufferConsumer.readStringEncoded();
  }
}
