import { expect, test } from "vitest";

import type { Connection } from "@/Connection.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";
import { delay } from "@Tests/Fixtures/utils.js";

interface SampleRow {
  id: number;
  value: number;
}

async function createSampleTable(connection: Connection) {
  const tableName = `table-${String(Math.random())}`;

  await connection.execute(`CREATE TEMPORARY TABLE \`${tableName}\` (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        value INT UNSIGNED NULL DEFAULT NULL,
        PRIMARY KEY (id)
      )`);

  return tableName;
}

test("transaction(): noop", async () => {
  expect.assertions(3);

  let counter = 0;

  const connection = testConnection();

  await connection.transaction(async () => {
    await delay(0);

    expect(++counter).toBe(1);
  });

  await connection.transaction(() => {
    expect(++counter).toBe(2);
  });

  expect(++counter).toBe(3);

  void connection.close();
});

test("transaction(): auto-commit", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(
      `INSERT INTO \`${tableName}\` (value) VALUES (123)`,
    );
  });

  await connection.transaction(async () => {
    const [result1] = await connection.query<SampleRow>(
      `SELECT * FROM \`${tableName}\``,
    );

    expect(result1).toStrictEqual({ id: 1, value: 123 });
  });

  void connection.close();
});

test("transaction(): commit with return true", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(
      `INSERT INTO \`${tableName}\` (value) VALUES (123)`,
    );

    return true;
  });

  await connection.transaction(async () => {
    const [result1] = await connection.query<SampleRow>(
      `SELECT * FROM \`${tableName}\``,
    );

    expect(result1).toStrictEqual({ id: 1, value: 123 });
  });

  void connection.close();
});

test("transaction(): rollback with return false", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(
      `INSERT INTO \`${tableName}\` (value) VALUES (123)`,
    );

    return false;
  });

  await connection.transaction(async () => {
    const [result1] = await connection.query<SampleRow>(
      `SELECT * FROM \`${tableName}\``,
    );

    expect(result1).toStrictEqual(void 0);
  });

  void connection.close();
});

test("transaction(): auto-rollback after a SQL error", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(
      `INSERT INTO \`${tableName}\` (value) VALUES (123)`,
    );

    await connection.execute(`ERROR!`);
  });

  await connection.transaction(async () => {
    const [result1] = await connection.query<SampleRow>(
      `SELECT * FROM \`${tableName}\``,
    );

    expect(result1).toStrictEqual(void 0);
  });

  void connection.close();
});

test("transaction(): rollback by uncaught error", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(
      `INSERT INTO \`${tableName}\` (value) VALUES (123)`,
    );

    throw new Error("uncaught error");
  });

  await connection.transaction(async () => {
    const [result1] = await connection.query<SampleRow>(
      `SELECT * FROM \`${tableName}\``,
    );

    expect(result1).toStrictEqual(void 0);
  });

  void connection.close();
});

test("transaction(): nested transactions", async () => {
  expect.assertions(1);

  const connection = testConnection();
  const tableName = await createSampleTable(connection);

  await connection.transaction(async () => {
    await connection.execute(`INSERT INTO \`${tableName}\` (value) VALUES (1)`);

    await connection.transaction(async () => {
      await connection.execute(
        `INSERT INTO \`${tableName}\` (value) VALUES (2)`,
      );

      await connection.transaction(async () => {
        await connection.execute(
          `INSERT INTO \`${tableName}\` (value) VALUES (3)`,
        );

        await connection.transaction(async () => {
          await connection.execute(
            `INSERT INTO \`${tableName}\` (value) VALUES (4)`,
          );
        });

        await connection.execute(
          `INSERT INTO \`${tableName}\` (value) VALUES (5)`,
        );

        return false;
      });

      await connection.execute(
        `INSERT INTO \`${tableName}\` (value) VALUES (6)`,
      );
    });

    await connection.execute(`INSERT INTO \`${tableName}\` (value) VALUES (7)`);
  });

  const results = await connection.query<SampleRow>(
    `SELECT * FROM \`${tableName}\``,
  );

  expect([...results]).toStrictEqual([
    { id: 1, value: 1 },
    { id: 2, value: 2 },
    { id: 6, value: 6 },
    { id: 7, value: 7 },
  ]);

  void connection.close();
});
