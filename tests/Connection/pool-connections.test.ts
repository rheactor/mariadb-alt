import { TestConnectionPool } from "@Tests/Fixtures/test-connection";
import { delay } from "@Tests/Fixtures/utils";
import { expect, test } from "vitest";

test("debug { idleConnections: 1, connections: 2, idleTimeout: 100 }", () => {
  const connectionPool = TestConnectionPool({
    idleConnections: 1,
    connections: 2,
    idleTimeout: 100,
  });

  expect(connectionPool.debug.connectionsCount).toBe(1);
  expect(connectionPool.debug.idleConnectionsCount).toBe(1);
});

test("query() { idleConnections: 1, connections: 2, idleTimeout: 100 }", async () => {
  expect.assertions(11);

  const connectionPool = TestConnectionPool({
    idleConnections: 1,
    connections: 2,
    idleTimeout: 100,
  });

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

test("query(): force idle connection to be renewed", async () => {
  expect.assertions(5);

  const connectionPool = TestConnectionPool({
    idleConnections: 1,
    connections: 1,
  });

  const referenceValue = Math.random();

  // From IDLE, that will requires to be awaited because of 1 connection idle limit.
  const query1 = connectionPool.acquire(async (connection) => {
    await delay(100);

    expect(connection.wasUsed).toBeFalsy();

    return connection.execute("SET @REFERENCE_VALUE := ?", [referenceValue]);
  });

  // Check if reference value stills is the same from previous acquire: it must be, because the connection is the same.
  const query2 = connectionPool.acquire(async (connection) => {
    expect(connection.wasUsed).toBeTruthy();

    return connection.query<{ "@REFERENCE_VALUE": number }>(
      "SELECT @REFERENCE_VALUE",
    );
  });

  // Force renew, so reference value must be null now.
  const query3 = connectionPool.acquire(
    async (connection) => {
      expect(connection.wasUsed).toBeFalsy();

      return connection.query<{ "@REFERENCE_VALUE": null }>(
        "SELECT @REFERENCE_VALUE",
      );
    },
    { renew: true },
  );

  const [, result2, result3] = await Promise.all([query1, query2, query3]);

  expect([...result2][0]?.["@REFERENCE_VALUE"]).toBe(referenceValue);
  expect([...result3][0]?.["@REFERENCE_VALUE"]).toBeNull();
});

test("query(): force connections over-limit using { immediate: true } option", async () => {
  expect.assertions(15);

  const connectionPool = TestConnectionPool({
    connections: 1,
  });

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

test("query(): force connections over-limit using { immediate: true } option, but still respecting hard-limit", async () => {
  expect.assertions(15);

  const connectionPool = TestConnectionPool({
    connections: 1,
    connectionsHardLimit: 1,
  });

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

test("query(): with afterAuthenticated() option must return reference value", async () => {
  expect.assertions(1);

  const connectionPool = TestConnectionPool({
    async afterAuthenticated() {
      await this.execute("SET @REFERENCE_VALUE = 123");
      await this.query("SELECT SLEEP(0.1)");
      await this.execute("SET @REFERENCE_VALUE = @REFERENCE_VALUE * 2");
    },
  });

  await connectionPool.execute("SET @REFERENCE_VALUE = @REFERENCE_VALUE * 2");

  expect(
    [...(await connectionPool.query("SELECT @REFERENCE_VALUE AS a"))][0],
  ).toStrictEqual({ a: 492n });
});
