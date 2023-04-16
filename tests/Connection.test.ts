import { type Connection } from "@/Connection";
import { TimeFormat } from "@/Formats/TimeFormat";
import { Collations, FieldTypes } from "@/Protocol/Enumerations";
import { ExecuteError } from "@/Protocol/Packet/Errors/ExecuteError";
import { QueryError } from "@/Protocol/Packet/Errors/QueryError";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
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

    test("close() command", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection();

      connectionBase.once("closed", () => {
        expect(true).toBe(true);
        done();
      });

      connectionBase
        .close()
        .then(() => {
          expect(true).toBe(true);

          return null;
        })
        .catch(() => {
          /** empty */
        });
    });

    type QuerySelectUnit = [
      string,
      TimeFormat | bigint | number | string | null
    ];

    const querySelectUnits: QuerySelectUnit[] = [
      ["NULL", null],
      ["'abc'", "abc"],
      ["123", 123],
      ["123.45", 123.45],
      ["1152921504606846975", 1152921504606846975n],
      ["HEX('example')", "6578616D706C65"],
      ["x'6578616D706C65'", "example"],
      ["'您好 (chinese)'", "您好 (chinese)"],
      ["'नमस्ते (Hindi)'", "नमस्ते (Hindi)"],
      ["'привет (Russian)'", "привет (Russian)"],
      ["TIME('999:00:00')", TimeFormat.parse("838:59:59")],
      ["TIME('-999:00:00')", TimeFormat.parse("-838:59:59")],
    ];

    describe.each(querySelectUnits)("query()", (input, outputNormalized) => {
      let connectionBase: Connection;

      beforeAll(() => {
        connectionBase = TestConnection();
      });

      test(`SELECT ${input} via queryDetailed()`, async () => {
        const queryResult = await connectionBase.queryDetailed(
          `SELECT ${input} AS \`value\``
        );

        expect(queryResult).toBeInstanceOf(PacketResultSet);

        if (queryResult instanceof PacketResultSet) {
          const queryRows = [...queryResult.getRows()];

          expect(Object.keys(queryRows)).toHaveLength(1);

          const queryRow = queryRows[0]!["value"];

          if (typeof outputNormalized === "bigint") {
            expect((queryRow as bigint).toString()).toBe(
              outputNormalized.toString()
            );
          } else {
            expect(queryRow).toStrictEqual(outputNormalized);
          }
        }
      });

      test(`SELECT ${input} via query()`, async () => {
        const queryResult = await connectionBase.query<{
          value: typeof outputNormalized;
        }>(`SELECT ${input} AS \`value\``);

        const [result] = [...queryResult];

        if (typeof outputNormalized === "bigint") {
          expect((result!.value as bigint).toString()).toBe(
            outputNormalized.toString()
          );
        } else {
          expect(result!.value).toStrictEqual(outputNormalized);
        }
      });

      afterAll(() => {
        connectionBase.close();
      });
    });

    describe("query()", () => {
      let connectionBase: Connection;

      beforeAll(() => {
        connectionBase = TestConnection();
      });

      test(`create table`, async () => {
        const table = `test-${Math.random()}`;

        expect(
          await connectionBase.queryDetailed(
            `CREATE TEMPORARY TABLE \`${table}\` ( \`id\` INT NULL AUTO_INCREMENT, \`text\` VARCHAR(20), PRIMARY KEY (\`id\`) )`
          )
        ).toBeInstanceOf(PacketOk);

        const insertInto = await connectionBase.queryDetailed(
          `INSERT INTO \`${table}\` (\`id\`, \`text\`) VALUES (123, 'example')`
        );

        expect(insertInto).toBeInstanceOf(PacketOk);

        if (insertInto instanceof PacketOk) {
          expect(insertInto.affectedRows).toBe(1);
          expect(insertInto.lastInsertId).toBe(123);
        }

        const query = await connectionBase.queryDetailed(
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

      test(`query() error (without prepared statement)`, async () => {
        expect.assertions(2);

        try {
          await connectionBase.query("SELECT ?");
        } catch (error) {
          expect(error).toBeInstanceOf(QueryError);

          if (error instanceof QueryError) {
            expect(error.message).toBe("query error");
          }
        }
      });

      test(`query() error (prepared statement)`, async () => {
        expect.assertions(2);

        try {
          await connectionBase.query("SELECT ?", []);
        } catch (error) {
          expect(error).toBeInstanceOf(QueryError);

          if (error instanceof QueryError) {
            expect(error.message).toBe("query error");
          }
        }
      });

      test(`query() unexpected response type`, async () => {
        expect.assertions(2);

        try {
          await connectionBase.query("DO NULL");
        } catch (error) {
          expect(error).toBeInstanceOf(QueryError);

          if (error instanceof QueryError) {
            expect(error.message).toBe("unexpected query response type");
          }
        }
      });

      test(`execute()`, async () => {
        const result = await connectionBase.execute("DO NULL");

        expect(result).toBeInstanceOf(PacketOk);

        if (result instanceof PacketOk) {
          expect(result.affectedRows).toBe(0);
        }
      });

      test(`execute() error`, async () => {
        expect.assertions(2);

        try {
          await connectionBase.execute("SELECT ?");
        } catch (error) {
          expect(error).toBeInstanceOf(ExecuteError);

          if (error instanceof ExecuteError) {
            expect(error.message).toBe("query error");
          }
        }
      });

      test(`execute() unexpected response type`, async () => {
        expect.assertions(2);

        try {
          await connectionBase.execute("SELECT 1");
        } catch (error) {
          expect(error).toBeInstanceOf(ExecuteError);

          if (error instanceof ExecuteError) {
            expect(error.message).toBe("unexpected query response type");
          }
        }
      });

      afterAll(() => {
        connectionBase.close();
      });
    });

    describe("query()", () => {
      let packet65KB: Buffer;
      let packet65KBOnLimit: Buffer;
      let packet16MB: Buffer;
      let packet16MBOnLimit: Buffer;
      let connectionBase: Connection;

      beforeAll(() => {
        connectionBase = TestConnection();
        packet16MB = Buffer.alloc(16 * 1024 ** 2).fill("0");
        packet16MBOnLimit = packet16MB.subarray(0, packet16MB.length - 21);
        packet65KB = packet16MB.subarray(0, 65 * 1024);
        packet65KBOnLimit = packet65KB.subarray(0, 65 * 1024 - 1080);
      });

      test(`65KB packet chunked`, async () => {
        const [result] = await connectionBase.query<{ packet: string }>(
          `SELECT '${packet65KB.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet65KB.length);
        expect(result!.packet).toStrictEqual(packet65KB.toString("binary"));
      });

      test(`65KB packet chunked on limit`, async () => {
        const [result] = await connectionBase.query<{ packet: string }>(
          `SELECT '${packet65KBOnLimit.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet65KBOnLimit.length);
        expect(result!.packet).toStrictEqual(
          packet65KBOnLimit.toString("binary")
        );
      });

      test(`16MB packet on limit`, async () => {
        const [result] = await connectionBase.query<{ packet: string }>(
          `SELECT '${packet16MBOnLimit.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet16MBOnLimit.length);
        expect(result!.packet).toStrictEqual(
          packet16MBOnLimit.toString("binary")
        );
      }, 5000);

      test(`16MB packet (without prepared statement)`, async () => {
        const [result] = await connectionBase.query<{ packet: number }>(
          `SELECT LENGTH('${packet16MB.toString("binary")}') AS packet`
        );

        expect(result!.packet).toStrictEqual(packet16MB.length);
      });

      test(`16MB packet (prepared statement)`, async () => {
        const [result] = await connectionBase.query<{ packet: number }>(
          `SELECT LENGTH(?) AS packet`,
          [packet16MB]
        );

        expect(result!.packet).toStrictEqual(packet16MB.length);
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

        if (error.cause instanceof PacketError) {
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

        if (error.cause instanceof PacketError) {
          expect(error.cause.code).toBe(1045);
        }
      });
    });
  });
});
