import { Packet } from "@/Protocol/Packet/Packet";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketProgress } from "@/Protocol/Packet/PacketProgress";

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

  test("fromResponse() PacketOk", () => {
    expect.assertions(4);

    const packetResponse = Packet.fromResponse(
      Buffer.from([
        // First 4-bytes is just ignored (it refer to Packet length + sequence).
        0x00, 0x00, 0x00, 0x00,
        // The 0x00 response type mean a Ok Packet.
        0x00,
        // Affected rows.
        0xfc, 0x10, 0x20,
        // Last insert ID.
        0xfd, 0x10, 0x20, 0x30,
        // Server status.
        0x02, 0x00,
        // Warning count.
        0x10, 0x20,
      ])
    );

    if (packetResponse instanceof PacketOk) {
      expect(packetResponse.affectedRows).toBe(0x2010);
      expect(packetResponse.lastInsertId).toBe(0x302010);
      expect(packetResponse.serverStatus).toBe(0x0002);
      expect(packetResponse.warningCount).toBe(0x2010);
    }
  });

  test("fromResponse() PacketProgress", () => {
    expect.assertions(4);

    const packetResponse = Packet.fromResponse(
      Buffer.from([
        // First 4-bytes is just ignored (it refer to Packet length + sequence).
        0x00, 0x00, 0x00, 0x00,
        // The 0xFF response type mean an Error Packet.
        0xff,
        // Progress Packet.
        0xff, 0xff,
        // Stage.
        0x10,
        // Max Stage.
        0x20,
        // Progress.
        0x10, 0x20, 0x30,
        // Progress info.
        0x07, 0x45, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
      ])
    );

    if (packetResponse instanceof PacketProgress) {
      expect(packetResponse.stage).toBe(0x10);
      expect(packetResponse.maxStage).toBe(0x20);
      expect(packetResponse.progress).toBe(0x302010);
      expect(packetResponse.progressInfo).toStrictEqual(Buffer.from("Example"));
    }
  });

  test("fromResponse() PacketError", () => {
    expect.assertions(2);

    const packetResponse = Packet.fromResponse(
      Buffer.from([
        // First 4-bytes is just ignored (it refer to Packet length + sequence).
        0x00, 0x00, 0x00, 0x00,
        // The 0xFF response type mean an Error Packet.
        0xff,
        // Error code.
        0x10, 0x20,
        // Message.
        0x45, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
      ])
    );

    if (packetResponse instanceof PacketError) {
      expect(packetResponse.code).toBe(0x2010);
      expect(packetResponse.message).toBe("Example");
    }
  });

  test("fromResponse() PacketErrorState", () => {
    expect.assertions(3);

    const packetResponse = Packet.fromResponse(
      Buffer.from([
        // First 4-bytes is just ignored (it refer to Packet length + sequence).
        0x00, 0x00, 0x00, 0x00,
        // The 0xFF response type mean an Error Packet.
        0xff,
        // Error code.
        0x10, 0x20,
        // SQL State Market.
        0x23,
        // SQL State.
        0x48, 0x59, 0x30, 0x30, 0x30,
        // Message.
        0x45, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
      ])
    );

    if (packetResponse instanceof PacketErrorState) {
      expect(packetResponse.code).toBe(0x2010);
      expect(packetResponse.message).toBe("Example");
      expect(packetResponse.state).toBe("HY000");
    }
  });
});
