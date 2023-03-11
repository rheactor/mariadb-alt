import { Packet } from "@/Protocol/Packet/Packet";

describe("Protocol/Packet/Packet", () => {
  test("basic Packet", () => {
    const packetCOMPing = new Packet(Buffer.from("\x01\0\0\x10\x0E"));

    expect(packetCOMPing.length).toBe(1);
    expect(packetCOMPing.sequence).toBe(16);
    expect(packetCOMPing.body).toStrictEqual(Buffer.from("\x0E"));
  });

  test("Packet with wrong length must crop body at length", () => {
    const packetBadLength = new Packet(Buffer.from("\x01\0\0\0\x0E\x0E"));

    expect(packetBadLength.length).toBe(1);
    expect(packetBadLength.sequence).toBe(0);
    expect(packetBadLength.body).toStrictEqual(Buffer.from("\x0E"));
  });

  test("Packet with wrong length must auto-fix", () => {
    const packetBadLength = new Packet(Buffer.from("\x10\0\0\0\x0E"));

    expect(packetBadLength.length).toBe(1);
    expect(packetBadLength.sequence).toBe(0);
    expect(packetBadLength.body).toStrictEqual(Buffer.from("\x0E"));
  });

  test("empty Packet", () => {
    const packetEmpty = new Packet(Buffer.from("\0\0\0\0"));

    expect(packetEmpty.length).toBe(0);
    expect(packetEmpty.sequence).toBe(0);
    expect(packetEmpty.body).toStrictEqual(Buffer.from(""));
  });

  test("create PING Packet", () => {
    const packetEmpty = new Packet(Packet.createPing(2));

    expect(packetEmpty.length).toBe(1);
    expect(packetEmpty.sequence).toBe(2);
    expect(packetEmpty.body).toStrictEqual(Buffer.from("\x0E"));
  });

  test("split a Packet", () => {
    const packetExample = new Packet(
      Packet.from(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]), 0)
    );

    const packets = packetExample.split(3) as [Packet, Packet, Packet];

    expect(packets[0].length).toBe(3);
    expect(packets[0].sequence).toBe(0);
    expect(packets[0].body).toStrictEqual(Buffer.from("\0\x01\x02"));

    expect(packets[1].length).toBe(3);
    expect(packets[1].sequence).toBe(1);
    expect(packets[1].body).toStrictEqual(Buffer.from("\x03\x04\x05"));

    expect(packets[2].length).toBe(1);
    expect(packets[2].sequence).toBe(2);
    expect(packets[2].body).toStrictEqual(Buffer.from("\x06"));
  });
});
