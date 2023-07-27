import { type ConnectionPool } from "@/ConnectionPool";
import { type DateTimeFormat } from "@/Formats/DateTimeFormat";
import { type PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";
import { TestConnectionPool } from "@Tests/Fixtures/TestConnection";
import { delay, getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  interface TimeSleepResultSet {
    time: DateTimeFormat;
    sleep: number | null;
  }

  describe("option.afterAuthenticated", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool();
    });

    test("check sql_mode", async () => {
      const [result] = await connectionPool.query<{
        "@@SESSION.sql_mode": string;
      }>("SELECT @@SESSION.sql_mode");

      expect(result).toStrictEqual({
        "@@SESSION.sql_mode":
          "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION",
      });
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("option.connections", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({ connections: undefined });
    });

    test("query()", async () => {
      const query = await connectionPool.queryRaw("SELECT 1");

      expect(query).toBeInstanceOf(PacketResultSet);

      if (query instanceof PacketResultSet) {
        expect([...query.getRows()]).toStrictEqual([{ "1": 1 }]);
      }
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("query() simultaneous", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({ idleTimeout: undefined });
    });

    test("debug", () => {
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
    });

    test("query() simultaneous", async () => {
      expect.assertions(4);

      const query1 = connectionPool.query<TimeSleepResultSet>(
        "SELECT NOW() AS time, SLEEP(0.1) AS sleep",
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);

      const query2 = connectionPool.query<TimeSleepResultSet>(
        "SELECT NOW() AS time, NULL AS sleep",
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

      await Promise.all([query1, query2])
        .then(([result1, result2]) => {
          const set1 = [...result1][0]!;
          const set2 = [...result2][0]!;

          expect(set2.time.toNativeDate().getTime()).toBeLessThan(
            set1.time.toNativeDate().getTime(),
          );

          return true;
        })
        .catch(() => {
          // empty
        });
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("query() queued", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({ connections: 1 });
    });

    test("debug", () => {
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
    });

    test("query() queued", async () => {
      expect.assertions(6);

      const query1 = connectionPool.query<TimeSleepResultSet>(
        "SELECT NOW() AS time, SLEEP(0.1) AS sleep",
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);

      const query2 = connectionPool.query<TimeSleepResultSet>(
        "SELECT NOW() AS time, NULL AS sleep",
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      await Promise.all([query1, query2])
        .then(([result1, result2]) => {
          expect(connectionPool.debug.idleConnectionsCount).toBe(1);
          expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

          const set1 = [...result1][0]!;
          const set2 = [...result2][0]!;

          expect(set2.time.toNativeDate().getTime()).toBeGreaterThan(
            set1.time.toNativeDate().getTime(),
          );

          return true;
        })
        .catch(() => {
          // empty
        });
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("connections", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({
        idleConnections: 1,
        connections: 2,
        idleTimeout: 100,
      });
    });

    test("debug", () => {
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
    });

    test("connections", async () => {
      const query1 = connectionPool.query("SELECT NOW(), SLEEP(0.1)"); // from idle

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);

      const query2 = connectionPool.query("SELECT NOW(), SLEEP(0.1)"); // new connection

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(2);

      const query3 = connectionPool.query("SELECT NOW(), SLEEP(0.1)"); // queued acquisition

      expect(connectionPool.debug.connectionsCount).toBe(2);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      await Promise.all([query1, query2, query3]);

      expect(connectionPool.debug.idleConnectionsCount).toBe(2);
      expect(connectionPool.debug.connectionsCount).toBe(2);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

      await delay(250);

      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
      expect(connectionPool.debug.connectionsCount).toBe(1);
    }, 1000);

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("connections", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({
        idleConnections: 1,
        connections: 1,
      });
    });

    test("force idle connection to be renewed", async () => {
      const referenceValue = Math.random();

      // From IDLE, that will requires to be awaited because of 1 connection idle limit.
      const query1 = connectionPool.acquire(async (connection) => {
        await delay(100);

        expect(connection.wasUsed).toBe(false);

        return connection.execute("SET @REFERENCE_VALUE := ?", [
          referenceValue,
        ]);
      });

      // Check if reference value stills is the same from previous acquire: it must be, because the connection is the same.
      const query2 = connectionPool.acquire(async (connection) => {
        expect(connection.wasUsed).toBe(true);

        return connection.query<{ "@REFERENCE_VALUE": number }>(
          "SELECT @REFERENCE_VALUE",
        );
      });

      // Force renew, so reference value must be null now.
      const query3 = connectionPool.acquire(
        async (connection) => {
          expect(connection.wasUsed).toBe(false);

          return connection.query<{ "@REFERENCE_VALUE": null }>(
            "SELECT @REFERENCE_VALUE",
          );
        },
        { renew: true },
      );

      const [, result2, result3] = await Promise.all([query1, query2, query3]);

      expect([...result2][0]?.["@REFERENCE_VALUE"]).toBe(referenceValue);
      expect([...result3][0]?.["@REFERENCE_VALUE"]).toBe(null);
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("connections", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({
        connections: 1,
      });
    });

    test("force connections over-limit using .immediate=true option", async () => {
      expect.assertions(15);

      const query1 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.01)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

      const query2 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.02)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      const query3 = connectionPool.acquire(
        async (connection) => connection.query("SELECT SLEEP(0.03)"),
        { immediate: true },
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(2);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      const query4 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.04)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(2);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(2);

      await Promise.all([query1, query2, query3, query4]);

      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("connections", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool({
        connections: 1,
        connectionsHardLimit: 1,
      });
    });

    test("force connections over-limit using .immediate=true option, but respecting hard-limit", async () => {
      expect.assertions(15);

      const query1 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.01)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

      const query2 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.02)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      const query3 = connectionPool.acquire(
        async (connection) => connection.query("SELECT SLEEP(0.03)"),
        { immediate: true },
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(2);

      const query4 = connectionPool.acquire(async (connection) =>
        connection.query("SELECT SLEEP(0.04)"),
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(3);

      await Promise.all([query1, query2, query3, query4]);

      expect(connectionPool.debug.idleConnectionsCount).toBe(1);
      expect(connectionPool.debug.connectionsCount).toBe(1);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);
    });

    afterAll(() => {
      connectionPool.close();
    });
  });

  describe("connections", () => {
    let connectionPool: ConnectionPool | undefined = undefined;

    test("afterAuthenticated() must return reference value", async () => {
      connectionPool = TestConnectionPool({
        async afterAuthenticated() {
          await this.execute("SET @REFERENCE_VALUE = 123");
          await this.query("SELECT SLEEP(0.1)");
          await this.execute("SET @REFERENCE_VALUE = @REFERENCE_VALUE * 2");
        },
      });

      await connectionPool.execute(
        "SET @REFERENCE_VALUE = @REFERENCE_VALUE * 2",
      );

      expect(
        [...(await connectionPool!.query("SELECT @REFERENCE_VALUE AS a"))][0],
      ).toStrictEqual({ a: 492n });
    });

    afterAll(() => {
      connectionPool?.close();
    });
  });

  describe("batch queries", () => {
    let connectionPool: ConnectionPool;

    beforeAll(() => {
      connectionPool = TestConnectionPool();
    });

    test(`batchQueryRaw() with only PacketResultSet`, async () => {
      const [query1, query2] = (await connectionPool.batchQueryRaw(
        "SELECT 1, 2; SELECT 3",
      )) as [PacketResultSet, PacketResultSet];

      expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect([...query2.getRows()]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchQueryRaw() with only PacketOK`, async () => {
      const [result1, result2] = (await connectionPool.batchQueryRaw(
        "DO NULL; DO NULL",
      )) as [PacketOk, PacketOk];

      expect(result1.serverStatus).toBe(0x0a);
      expect(result2.serverStatus).toBe(0x02);
    });

    test(`batchQueryRaw() mixing PacketOK and PacketResultSet #1`, async () => {
      const [query1, result2, query3] = (await connectionPool.batchQueryRaw(
        "SELECT 1, 2; DO NULL; SELECT 3",
      )) as [PacketResultSet, PacketOk, PacketResultSet];

      expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect(result2.serverStatus).toBe(0x0a);
      expect([...query3.getRows()]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchQueryRaw() mixing PacketOK and PacketResultSet #2`, async () => {
      const [result1, query2, result3] = (await connectionPool.batchQueryRaw(
        "DO NULL; SELECT 1, 2; DO NULL",
      )) as [PacketOk, PacketResultSet, PacketOk];

      expect(result1.serverStatus).toBe(0x0a);
      expect([...query2.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect(result3.serverStatus).toBe(0x02);
    });

    test(`batchQuery()`, async () => {
      const [query1, query2] = await connectionPool.batchQuery(
        "SELECT 1, 2; SELECT 3",
      );

      expect([...query1!]).toStrictEqual([{ 1: 1, 2: 2 }]);
      expect([...query2!]).toStrictEqual([{ 3: 3 }]);
    });

    test(`batchExecute()`, async () => {
      const [result1, result2] = await connectionPool.batchExecute(
        "DO NULL; DO NULL",
      );

      expect(result1!.serverStatus).toBe(0x0a);
      expect(result2!.serverStatus).toBe(0x02);
    });

    afterAll(() => {
      connectionPool.close();
    });
  });
});
