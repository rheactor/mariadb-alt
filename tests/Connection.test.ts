import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";

describe("/Connection", () => {
  describe("connection ready", () => {
    test("authenticate", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection();

      connectionBase.on("closed", () => done());

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

    type QuerySelectUnit = [string, bigint | number | string | null];

    const querySelectUnits: QuerySelectUnit[] = [
      ["'abc'", "abc"],
      ["123", 123],
      ["NULL", null],
      ["123.45", 123.45],
      ["1152921504606846975", 1152921504606846975n],
    ];

    describe.each(querySelectUnits)("query()", (input, output) => {
      const connectionBase = TestConnection();

      test(`SELECT ${input}`, async () => {
        const queryResult = await connectionBase.query(
          `SELECT ${input} AS \`value\``
        );

        expect(queryResult).toBeInstanceOf(PacketResultSet);

        if (queryResult instanceof PacketResultSet) {
          expect(queryResult.rows).toHaveLength(1);

          // eslint-disable-next-line prefer-destructuring
          const resultValue = queryResult.rows[0]![0];

          if (typeof resultValue === "bigint") {
            expect(resultValue.toString(16)).toBe(output?.toString(16));
          } else {
            expect(resultValue).toBe(output);
          }
        }
      });

      afterAll(() => {
        connectionBase.close();
      });
    });
  });

  describe("connection error", () => {
    test("invalid port", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection({ port: 1 });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("ECONNREFUSED");
      });
    });

    test("invalid user", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection({
        user: `random-user-${Math.random()}`,
      });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect.assertions(3);

        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("random-user");

        if (error.cause instanceof PacketErrorState) {
          expect(error.cause.code).toBe(1045);
        }
      });
    });

    test("wrong password", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection({
        password: Math.random().toString(),
      });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect.assertions(3);

        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("denied for user");

        if (error.cause instanceof PacketErrorState) {
          expect(error.cause.code).toBe(1045);
        }
      });
    });
  });
});
