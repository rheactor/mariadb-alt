import { PacketReassembler } from "@/Protocol/PacketReassembler/PacketReassembler";

test("new PacketReassembler(empty callback)", () => {
  const reassembler = new PacketReassembler(() => {
    // empty
  });

  expect(() => {
    reassembler.push(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01]));
  }).toThrow("malformed packet");
});
