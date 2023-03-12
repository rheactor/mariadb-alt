import { BufferConsumer } from "@/Utils/BufferConsumer";

export class PacketProgress {
  public stage: number;

  public maxStage: number;

  public progress: number;

  public progressInfo: Buffer | null;

  public constructor(packet: Buffer) {
    const bufferConsumer = new BufferConsumer(packet);

    this.stage = bufferConsumer.readInt();
    this.maxStage = bufferConsumer.readInt();
    this.progress = bufferConsumer.readInt(3);
    this.progressInfo = bufferConsumer.readStringEncoded();
  }
}
