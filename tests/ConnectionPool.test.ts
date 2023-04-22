import { type ConnectionPool } from "@/ConnectionPool";
import { type DateTimeFormat } from "@/Formats/DateTimeFormat";
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
      const query = await connectionPool.queryDetailed(
        "SELECT @@SESSION.sql_mode"
      );

      expect(query).toBeInstanceOf(PacketResultSet);

      if (query instanceof PacketResultSet) {
        expect(query.getRows().next().value).toStrictEqual({
          "@@SESSION.sql_mode":
            "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION",
        });
      }
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
      const query = await connectionPool.queryDetailed("SELECT 1");

      expect(query).toBeInstanceOf(PacketResultSet);

      if (query instanceof PacketResultSet) {
        expect(query.getRows().next().value).toStrictEqual({ "1": 1 });
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
      expect.assertions(5);

      const query1 = connectionPool.queryDetailed(
        "SELECT NOW() AS time, SLEEP(0.1) AS sleep"
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);

      const query2 = connectionPool.queryDetailed(
        "SELECT NOW() AS time, NULL AS sleep"
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

      await Promise.all([query1, query2])
        .then(([result1, result2]) => {
          if (
            result1 instanceof PacketResultSet &&
            result2 instanceof PacketResultSet
          ) {
            expect(true).toBe(true);

            const set1 = [...result1.getRows<TimeSleepResultSet>()][0]!;
            const set2 = [...result2.getRows<TimeSleepResultSet>()][0]!;

            expect(set2.time.toNativeDate().getTime()).toBeLessThan(
              set1.time.toNativeDate().getTime()
            );
          }

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
      expect.assertions(7);

      const query1 = connectionPool.queryDetailed(
        "SELECT NOW() AS time, SLEEP(0.1) AS sleep"
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);

      const query2 = connectionPool.queryDetailed(
        "SELECT NOW() AS time, NULL AS sleep"
      );

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.acquisitionQueueSize).toBe(1);

      await Promise.all([query1, query2])
        .then(([result1, result2]) => {
          expect(connectionPool.debug.idleConnectionsCount).toBe(1);
          expect(connectionPool.debug.acquisitionQueueSize).toBe(0);

          if (
            result1 instanceof PacketResultSet &&
            result2 instanceof PacketResultSet
          ) {
            expect(true).toBe(true);

            const set1 = [...result1.getRows<TimeSleepResultSet>()][0]!;
            const set2 = [...result2.getRows<TimeSleepResultSet>()][0]!;

            expect(set2.time.toNativeDate().getTime()).toBeGreaterThan(
              set1.time.toNativeDate().getTime()
            );
          }

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
      const query1 = connectionPool.queryDetailed("SELECT NOW(), SLEEP(0.1)"); // from idle

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(1);

      const query2 = connectionPool.queryDetailed("SELECT NOW(), SLEEP(0.1)"); // new connection

      expect(connectionPool.debug.idleConnectionsCount).toBe(0);
      expect(connectionPool.debug.connectionsCount).toBe(2);

      const query3 = connectionPool.queryDetailed("SELECT NOW(), SLEEP(0.1)"); // queued acquisition

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
      const query1 = connectionPool.acquire(async (connection) =>
        connection.execute("SET @REFERENCE_VALUE := ?", [referenceValue])
      );

      // Check if reference value stills is the same from previous acquire: it must be, because the connection is the same.
      const query2 = connectionPool.acquire(async (connection) =>
        connection.query<{ "@REFERENCE_VALUE": number }>(
          "SELECT @REFERENCE_VALUE"
        )
      );

      // Force renew, so reference value must be null now.
      const query3 = connectionPool.acquire(
        async (connection) =>
          connection.query<{ "@REFERENCE_VALUE": null }>(
            "SELECT @REFERENCE_VALUE"
          ),
        { renew: true }
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
        afterAuthenticated() {
          this.execute("SET @REFERENCE_VALUE = 123");
        },
      });
    });

    test("afterAuthenticated() must return reference value", async () => {
      const result = await connectionPool.queryDetailed(
        "SELECT @REFERENCE_VALUE AS a"
      );

      expect(result).toBeInstanceOf(PacketResultSet);
      expect([...(result as PacketResultSet).getRows()][0]).toStrictEqual({
        a: 123n,
      });
    });

    afterAll(() => {
      connectionPool.close();
    });
  });
});
