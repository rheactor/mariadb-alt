import { TestConnection } from "@Tests/Fixtures/test-connection";
import { delay } from "@Tests/Fixtures/utils";
import { expect, test } from "vitest";

import { type Connection } from "@/Connection";

interface SampleRow {
  id: number;
  value: number;
}

const createSampleTable = async (connection: Connection) => {
  const tableName = `table-${Math.random()}`;

  await connection.execute(`CREATE TEMPORARY TABLE \`${tableName}\` (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        value INT UNSIGNED NULL DEFAULT NULL,
        PRIMARY KEY (id)
      )`);

  return tableName;
};

test("transaction(): noop", async () => {
  let counter = 0;

  const connection = TestConnection();

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

  const connection = TestConnection();
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

  const connection = TestConnection();
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

  const connection = TestConnection();
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

  const connection = TestConnection();
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

  const connection = TestConnection();
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
