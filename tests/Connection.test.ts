import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { TestConnection } from "@Tests/Fixtures/TestConnection";

describe("/Connection", () => {
  describe("connection ready", () => {
    test("socket initialization", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection();

      connectionBase.once("closed", () => done());

      connectionBase.once("connected", (connection) => {
        expect(connection.isConnected()).toBe(true);
      });

      connectionBase.once("authenticating", (connection) => {
        expect(connection.isAuthenticating()).toBe(true);
      });

      connectionBase.once("authenticated", (connection) => {
        expect(connection.isAuthenticated()).toBe(true);
        connection.close();
      });
    });

    test("ping() command", async () => {
      expect.assertions(2);

      const connectionBase = TestConnection();

      const ping1 = expect(connectionBase.ping()).resolves.toBeInstanceOf(
        PacketOk
      );

      const ping2 = expect(connectionBase.ping()).resolves.toBeInstanceOf(
        PacketOk
      );

      await Promise.all([ping1, ping2]);

      connectionBase.close();
    });
  });

  describe("connection error", () => {
    test("invalid port", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection({ port: 0 });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("EADDRNOTAVAIL");
      });
    });

    test("invalid database", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection({
        database: `invalid-database-${Math.random()}`,
      });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("invalid-database");

        if (error.cause instanceof PacketErrorState) {
          expect(error.cause.code).toBe(1049);
        }
      });
    });
  });
});
