import { type Connection } from "@/Connection";
import { TimeFormat } from "@/Formats/TimeFormat";
import { Collations, FieldTypes } from "@/Protocol/Enumerations";
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

    type QuerySelectUnit = [
      string,
      string | null,
      TimeFormat | bigint | number | string | null
    ];

    const querySelectUnits: QuerySelectUnit[] = [
      ["NULL", null, null],
      ["'abc'", "abc", "abc"],
      ["123", "123", 123],
      ["123.45", "123.45", 123.45],
      ["1152921504606846975", "1152921504606846975", 1152921504606846975n],
      ["HEX('example')", "6578616D706C65", "6578616D706C65"],
      ["x'6578616D706C65'", "example", "example"],
      ["'您好 (chinese)'", "您好 (chinese)", "您好 (chinese)"],
      ["'नमस्ते (Hindi)'", "नमस्ते (Hindi)", "नमस्ते (Hindi)"],
      ["'привет (Russian)'", "привет (Russian)", "привет (Russian)"],
      ["TIME('999:00:00')", "838:59:59", new TimeFormat("838:59:59")],
      ["TIME('-999:00:00')", "-838:59:59", new TimeFormat("-838:59:59")],
    ];

    describe.each(querySelectUnits)(
      "query()",
      (input, output, outputNormalized) => {
        let connectionBase: Connection;

        beforeAll(() => {
          connectionBase = TestConnection();
        });

        test(`SELECT ${input}`, async () => {
          const queryResult = await connectionBase.query(
            `SELECT ${input} AS \`value\``
          );

          expect(queryResult).toBeInstanceOf(PacketResultSet);

          if (queryResult instanceof PacketResultSet) {
            const queryRows = [...queryResult.getRows()];

            expect(queryRows).toHaveLength(1);

            const queryRow = queryRows[0]!;

            expect(queryRow[0]?.toString() ?? null).toBe(output);

            const rowValueNormalized = PacketResultSet.transform(
              queryRow,
              queryResult.getFields()
            );

            if (typeof outputNormalized === "bigint") {
              expect((rowValueNormalized["value"] as bigint).toString()).toBe(
                outputNormalized.toString()
              );
            } else {
              expect(rowValueNormalized["value"]).toStrictEqual(
                outputNormalized
              );
            }
          }
        });

        afterAll(() => {
          connectionBase.close();
        });
      }
    );

    describe("query()", () => {
      let connectionBase: Connection;

      beforeAll(() => {
        connectionBase = TestConnection();
      });

      test(`Example`, async () => {
        const table = `test-${Math.random()}`;

        expect(
          await connectionBase.query(
            `CREATE TEMPORARY TABLE \`${table}\` ( \`id\` INT NULL AUTO_INCREMENT, \`text\` VARCHAR(20), PRIMARY KEY (\`id\`) )`
          )
        ).toBeInstanceOf(PacketOk);

        const insertInto = await connectionBase.query(
          `INSERT INTO \`${table}\` (\`id\`, \`text\`) VALUES (123, 'example')`
        );

        expect(insertInto).toBeInstanceOf(PacketOk);

        if (insertInto instanceof PacketOk) {
          expect(insertInto.affectedRows).toBe(1);
          expect(insertInto.lastInsertId).toBe(123);
        }

        const query = await connectionBase.query(
          `SELECT \`id\` as \`a\`, \`text\` FROM \`${table}\` \`b\``
        );

        expect(query).toBeInstanceOf(PacketResultSet);

        if (query instanceof PacketResultSet) {
          const queryMetadata = query.getFields();
          const queryMetadata1 = queryMetadata[0]!;

          expect(queryMetadata1.name).toBe("a");
          expect(queryMetadata1.collation).toBe(Collations.binary);
          expect(queryMetadata1.type).toBe(FieldTypes.INT);

          const queryMetadata2 = queryMetadata[1]!;

          expect(queryMetadata2.name).toBe("text");
          expect(queryMetadata2.collation).toBe(Collations.utf8mb4_general_ci);
          expect(queryMetadata2.type).toBe(FieldTypes.VARCHAR);
          expect(queryMetadata2.flags).toBe(0);
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
        user: `random-user-0.5318529997882291`,
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
