import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
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
  });

  describe("connection error: invalid port", () => {
    test("socket initialization", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection({ port: 0 });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("EADDRNOTAVAIL");
      });
    });
  });

  describe("connection error: invalid database", () => {
    test("socket initialization", (done) => {
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
