import { type Connection } from "@/Connection";
import { ExecuteError } from "@/Errors/ExecuteError";
import { PacketError } from "@/Errors/PacketError";
import { QueryError } from "@/Errors/QueryError";
import { TimeFormat } from "@/Formats/TimeFormat";
import { Collations, FieldTypes } from "@/Protocol/Enumerations";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  let connectionGlobal: Connection;

  beforeAll(() => {
    connectionGlobal = TestConnection();
  });

  afterAll(() => {
    connectionGlobal.close();
  });

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
        expect(connection.hasAuthenticated()).toBe(true);
        connection.close();
      });
    });

    test("ping() command", async () => {
      expect.assertions(2);

      const ping1 = expect(connectionGlobal.ping()).resolves.toBeInstanceOf(
        PacketOk
      );

      const ping2 = expect(connectionGlobal.ping()).resolves.toBeInstanceOf(
        PacketOk
      );

      await Promise.all([ping1, ping2]);
    });

    test("close() command before authentication", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection();

      connectionBase.once("closed", () => {
        expect(true).toBe(true);
        done();
      });

      connectionBase
        .close()
        .then(() => expect(true).toBe(true)) // no connected
        .catch(() => {
          /** empty */
        });
    });

    test("close() command after authentication", (done) => {
      expect.assertions(3);

      const connectionBase = TestConnection();

      connectionBase.once("closed", () => {
        expect(true).toBe(true);
        done();
      });

      connectionBase.once("authenticated", () => {
        expect(true).toBe(true);

        connectionBase
          .close()
          .then(() => expect(true).toBe(true)) //  connected
          .catch(() => {
            /** empty */
          });
      });
    });

    describe("afterAuthenticated() option", () => {
      let connectionBase: Connection;

      beforeAll(() => {
        connectionBase = TestConnection({
          afterAuthenticated() {
            this.execute("SET @REFERENCE_VALUE := ?", ["example"]);
          },
        });
      });

      test("test if reference value was set", async () => {
        expect([
          ...(await connectionBase.query<{ REFERENCE_VALUE: number }>(
            "SELECT @REFERENCE_VALUE"
          )),
        ]).toStrictEqual([{ "@REFERENCE_VALUE": Buffer.from("example") }]);
      });

      afterAll(() => {
        connectionBase.close();
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
      test(`SELECT ${input} via queryRaw()`, async () => {
        const queryResult = await connectionGlobal.queryRaw(
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
        const queryResult = await connectionGlobal.query<{
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
    });

    describe("query()", () => {
      test(`create table`, async () => {
        const table = `test-${Math.random()}`;

        expect(
          await connectionGlobal.queryRaw(
            `CREATE TEMPORARY TABLE \`${table}\` ( \`id\` INT NULL AUTO_INCREMENT, \`text\` VARCHAR(20), PRIMARY KEY (\`id\`) )`
          )
        ).toBeInstanceOf(PacketOk);

        const insertInto = await connectionGlobal.queryRaw(
          `INSERT INTO \`${table}\` (\`id\`, \`text\`) VALUES (123, 'example')`
        );

        expect(insertInto).toBeInstanceOf(PacketOk);

        if (insertInto instanceof PacketOk) {
          expect(insertInto.affectedRows).toBe(1);
          expect(insertInto.lastInsertId).toBe(123);
        }

        const query = await connectionGlobal.queryRaw(
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

      test(`query() returning LONGBLOB`, async () => {
        await connectionGlobal.execute('SET @LONGBLOB_REFERENCE := "example"');

        const results = await connectionGlobal.query<{
          "@LONGBLOB_REFERENCE": string;
        }>("SELECT @LONGBLOB_REFERENCE");

        expect([...results][0]?.["@LONGBLOB_REFERENCE"]).toStrictEqual(
          Buffer.from("example")
        );
      });

      test(`query() PS returning LONGBLOB`, async () => {
        await connectionGlobal.execute("SET @LONGBLOB_REFERENCE := ?", [
          "example1",
        ]);

        const results = await connectionGlobal.query<{
          a: Buffer;
          b: string;
          c: number;
        }>("SELECT @LONGBLOB_REFERENCE AS a, ? AS b, 123 AS c", ["example2"]);

        expect([...results][0]).toStrictEqual({
          a: Buffer.from("example1"),
          b: "example2",
          c: 123,
        });
      });

      test(`query() PS returning BIGINT`, async () => {
        await connectionGlobal.execute("SET @BIGINT_REFERENCE := ?", [123]);

        const results = await connectionGlobal.query<{ a: number }>(
          "SELECT @BIGINT_REFERENCE AS a"
        );

        expect([...results][0]).toStrictEqual({ a: 123n });
      });

      test(`query() error (without prepared statement)`, async () => {
        expect.assertions(2);

        try {
          await connectionGlobal.query("SELECT ?");
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
          await connectionGlobal.query("SELECT ?", []);
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
          await connectionGlobal.query("DO NULL");
        } catch (error) {
          expect(error).toBeInstanceOf(QueryError);

          if (error instanceof QueryError) {
            expect(error.message).toBe("unexpected query response type");
          }
        }
      });

      test(`execute()`, async () => {
        const result = await connectionGlobal.execute("DO NULL");

        expect(result).toBeInstanceOf(PacketOk);

        if (result instanceof PacketOk) {
          expect(result.affectedRows).toBe(0);
        }
      });

      test(`execute() PS without fields`, async () => {
        const result = await connectionGlobal.execute("DO ?", [null]);

        expect(result).toBeInstanceOf(PacketOk);

        if (result instanceof PacketOk) {
          expect(result.affectedRows).toBe(0);
        }
      });

      test(`execute() error`, async () => {
        expect.assertions(2);

        try {
          await connectionGlobal.execute("SELECT ?");
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
          await connectionGlobal.execute("SELECT 1");
        } catch (error) {
          expect(error).toBeInstanceOf(ExecuteError);

          if (error instanceof ExecuteError) {
            expect(error.message).toBe("unexpected query response type");
          }
        }
      });
    });

    describe("query()", () => {
      let packet65KB: Buffer;
      let packet65KBOnLimit: Buffer;
      let packet16MB: Buffer;
      let packet16MBOnLimit: Buffer;

      beforeAll(() => {
        packet16MB = Buffer.alloc(16 * 1024 ** 2).fill("0");
        packet16MBOnLimit = packet16MB.subarray(0, packet16MB.length - 21);
        packet65KB = packet16MB.subarray(0, 65 * 1024);
        packet65KBOnLimit = packet65KB.subarray(0, 65 * 1024 - 1080);
      });

      test(`65KB packet chunked`, async () => {
        const [result] = await connectionGlobal.query<{ packet: string }>(
          `SELECT '${packet65KB.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet65KB.length);
        expect(result!.packet).toStrictEqual(packet65KB.toString("binary"));
      });

      test(`65KB packet chunked on limit`, async () => {
        const [result] = await connectionGlobal.query<{ packet: string }>(
          `SELECT '${packet65KBOnLimit.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet65KBOnLimit.length);
        expect(result!.packet).toStrictEqual(
          packet65KBOnLimit.toString("binary")
        );
      });

      test(`16MB packet on limit`, async () => {
        const [result] = await connectionGlobal.query<{ packet: string }>(
          `SELECT '${packet16MBOnLimit.toString("binary")}' AS packet`
        );

        expect(result!.packet.length).toStrictEqual(packet16MBOnLimit.length);
        expect(result!.packet).toStrictEqual(
          packet16MBOnLimit.toString("binary")
        );
      }, 5000);

      test(`16MB packet (without prepared statement)`, async () => {
        const [result] = await connectionGlobal.query<{ packet: number }>(
          `SELECT LENGTH('${packet16MB.toString("binary")}') AS packet`
        );

        expect(result!.packet).toStrictEqual(packet16MB.length);
      }, 5000);

      test(`16MB packet (prepared statement)`, async () => {
        const [result] = await connectionGlobal.query<{ packet: number }>(
          `SELECT LENGTH(?) AS packet`,
          [packet16MB]
        );

        expect(result!.packet).toStrictEqual(packet16MB.length);
      }, 5000);
    });

    describe("query()", () => {
      test(`create table, insert and select using Prepared Statement`, async () => {
        const table = `test-${Math.random()}`;

        await connectionGlobal.execute(
          `CREATE TEMPORARY TABLE \`${table}\` (
            id INT NULL AUTO_INCREMENT,
            a VARCHAR(20) NULL,
            b INT NULL,
            c BLOB NULL,
            d INT NULL,
            e INT NULL,
            f INT NULL,
            g INT NULL,
            h INT NULL,
            i INT NULL,
            j INT NULL,
            k INT NULL,
            l INT NULL,
            m INT NULL,
            n INT NULL,
            PRIMARY KEY (id)
          )`
        );

        await connectionGlobal.execute(
          `INSERT INTO \`${table}\` (a, b, c, d, e, f, g, h, i, j, k, l, m, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "example",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]
        );
        await connectionGlobal.execute(
          `INSERT INTO \`${table}\` (a, b, c, d, e, f, g, h, i, j, k, l, m, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            null,
            123,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]
        );
        await connectionGlobal.execute(
          `INSERT INTO \`${table}\` (a, b, c, d, e, f, g, h, i, j, k, l, m, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            null,
            null,
            "example",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]
        );
        await connectionGlobal.execute(
          `INSERT INTO \`${table}\` (a, b, c, d, e, f, g, h, i, j, k, l, m, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]
        );
        await connectionGlobal.execute(
          `INSERT INTO \`${table}\` (a, b, c, d, e, f, g, h, i, j, k, l, m, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ["example", 123, "example", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        );

        const results = await connectionGlobal.query<{
          id: number;
          a: string | null;
          b: number | null;
          c: Buffer | null;
          d: number | null;
          e: number | null;
          f: number | null;
          g: number | null;
          h: number | null;
          i: number | null;
          j: number | null;
          k: number | null;
          l: number | null;
          m: number | null;
          n: number | null;
        }>(`SELECT * FROM \`${table}\` WHERE id > ?`, [0]);

        expect([...results]).toStrictEqual([
          {
            id: 1,
            a: "example",
            b: null,
            c: null,
            d: null,
            e: null,
            f: null,
            g: null,
            h: null,
            i: null,
            j: null,
            k: null,
            l: null,
            m: null,
            n: null,
          },
          {
            id: 2,
            a: null,
            b: 123,
            c: null,
            d: null,
            e: null,
            f: null,
            g: null,
            h: null,
            i: null,
            j: null,
            k: null,
            l: null,
            m: null,
            n: null,
          },
          {
            id: 3,
            a: null,
            b: null,
            c: Buffer.from("example"),
            d: null,
            e: null,
            f: null,
            g: null,
            h: null,
            i: null,
            j: null,
            k: null,
            l: null,
            m: null,
            n: null,
          },
          {
            id: 4,
            a: null,
            b: null,
            c: null,
            d: null,
            e: null,
            f: null,
            g: null,
            h: null,
            i: null,
            j: null,
            k: null,
            l: null,
            m: null,
            n: null,
          },
          {
            id: 5,
            a: "example",
            b: 123,
            c: Buffer.from("example"),
            d: 1,
            e: 2,
            f: 3,
            g: 4,
            h: 5,
            i: 6,
            j: 7,
            k: 8,
            l: 9,
            m: 10,
            n: 11,
          },
        ]);
      }, 1000);
    });
  });

  describe("batch queries", () => {
    test(`batchQueryRaw() with only PacketResultSet`, async () => {
      const [query1, query2] = (await connectionGlobal.batchQueryRaw(
        "SELECT 1, 2; SELECT 3"
      )) as [PacketResultSet, PacketResultSet];

      expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect([...query2.getRows()]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchQueryRaw() with only PacketOK`, async () => {
      const [result1, result2] = (await connectionGlobal.batchQueryRaw(
        "DO NULL; DO NULL"
      )) as [PacketOk, PacketOk];

      expect(result1.serverStatus).toBe(0x0a);
      expect(result2.serverStatus).toBe(0x02);
    });

    test(`batchQueryRaw() mixing PacketOK and PacketResultSet #1`, async () => {
      const [query1, result2, query3] = (await connectionGlobal.batchQueryRaw(
        "SELECT 1, 2; DO NULL; SELECT 3"
      )) as [PacketResultSet, PacketOk, PacketResultSet];

      expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect(result2.serverStatus).toBe(0x0a);
      expect([...query3.getRows()]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchQueryRaw() mixing PacketOK and PacketResultSet #2`, async () => {
      const [result1, query2, result3] = (await connectionGlobal.batchQueryRaw(
        "DO NULL; SELECT 1, 2; DO NULL"
      )) as [PacketOk, PacketResultSet, PacketOk];

      expect(result1.serverStatus).toBe(0x0a);
      expect([...query2.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect(result3.serverStatus).toBe(0x02);
    });

    test(`batchQuery()`, async () => {
      const [query1, query2] = await connectionGlobal.batchQuery(
        "SELECT 1, 2; SELECT 3"
      );

      expect([...query1!]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect([...query2!]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchExecute()`, async () => {
      const [result1, result2] = await connectionGlobal.batchExecute(
        "DO NULL; DO NULL"
      );

      expect(result1!.serverStatus).toBe(0x0a);
      expect(result2!.serverStatus).toBe(0x02);
    });
  });

  describe("connection error", () => {
    test("invalid port", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection({ port: 1 });

      connectionBase.once("closed", () => done());

      connectionBase.once("error", (connection, error) => {
        expect(connection.hasError()).toBe(true);
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

        expect(connection.hasError()).toBe(true);
        expect(error.message).toContain("random-user");

        if (error instanceof PacketError) {
          expect(error.code).toBe(1045);
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
        expect(connection.hasError()).toBe(true);
        expect(error.message).toContain("denied for user");

        if (error instanceof PacketError) {
          expect(error.code).toBe(1045);
        }
      });
    });
  });
});
