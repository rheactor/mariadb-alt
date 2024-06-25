import { chunk } from "@/Utils/BufferUtil.js";

export function createPacket(input: Buffer, sequence: number) {
  const packets: Buffer[] = [];

  for (const buffer of chunk(input, 16_777_215)) {
    const packet = Buffer.alloc(4 + buffer.length);

    packet.writeUIntLE(buffer.length, 0, 3);
    packet.writeUInt8((sequence + packets.length) & 0xff, 3);
    packet.set(buffer, 4);

    packets.push(packet);
  }

  // When the packet is sent exactly at the chunk boundary (16MB),
  // we need to send an additional empty packet.
  if ((input.length & 16_777_215) === 16_777_215) {
    packets.push(
      Buffer.from([
        // Length: 0 bytes.
        0,
        0,
        0,
        // Sequence: next.
        (sequence + packets.length) & 0xff,
      ]),
    );
  }

  return Buffer.concat(packets);
}
