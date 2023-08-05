import { TestConnectionPool } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { type DateTimeFormat } from "@/Formats/DateTimeFormat";

interface TimeSleepResultSet {
  time: DateTimeFormat;
  sleep: number | null;
}

test("debug", () => {
  const connectionBase = TestConnectionPool({ connections: 1 });

  expect(connectionBase.debug.connectionsCount).toBe(1);
  expect(connectionBase.debug.idleConnectionsCount).toBe(1);
});

test("query() queued", async () => {
  expect.assertions(6);

  const connectionBase = TestConnectionPool({ connections: 1 });

  const query1 = connectionBase.query<TimeSleepResultSet>(
    "SELECT NOW() AS time, SLEEP(0.1) AS sleep",
  );

  expect(connectionBase.debug.idleConnectionsCount).toBe(0);

  const query2 = connectionBase.query<TimeSleepResultSet>(
    "SELECT NOW() AS time, NULL AS sleep",
  );

  expect(connectionBase.debug.idleConnectionsCount).toBe(0);
  expect(connectionBase.debug.acquisitionQueueSize).toBe(1);

  await Promise.all([query1, query2])
    .then(([result1, result2]) => {
      expect(connectionBase.debug.idleConnectionsCount).toBe(1);
      expect(connectionBase.debug.acquisitionQueueSize).toBe(0);

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
