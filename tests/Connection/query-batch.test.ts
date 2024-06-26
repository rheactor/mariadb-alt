import { expect, test } from "vitest";

import { QueryException } from "@/Exceptions/QueryException.js";
import { UnexpectedResponseTypeException } from "@/Exceptions/UnexpectedResponseTypeException.js";
import type { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import type { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";

test(`batchQueryRaw() with only PacketResultSet`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  const [query1, query2] = (await connection.batchQueryRaw(
    "SELECT 1, 2; SELECT 3",
  )) as [PacketResultSet, PacketResultSet];

  expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect([...query2.getRows()]).toStrictEqual([{ 3: 3 }]);

  void connection.close();
});

test(`batchQueryRaw() with only PacketOK`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  const [result1, result2] = (await connection.batchQueryRaw(
    "DO NULL; DO NULL",
  )) as [PacketOk, PacketOk];

  expect(result1.serverStatus).toBe(0x0a);
  expect(result2.serverStatus).toBe(0x02);

  void connection.close();
});

test(`batchQueryRaw() mixing PacketOK and PacketResultSet #1`, async () => {
  expect.assertions(3);

  const connection = testConnection();

  const [query1, result2, query3] = (await connection.batchQueryRaw(
    "SELECT 1, 2; DO NULL; SELECT 3",
  )) as [PacketResultSet, PacketOk, PacketResultSet];

  expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect(result2.serverStatus).toBe(0x0a);
  expect([...query3.getRows()]).toStrictEqual([{ 3: 3 }]);

  void connection.close();
});

test(`batchQueryRaw() mixing PacketOK and PacketResultSet #2`, async () => {
  expect.assertions(3);

  const connection = testConnection();

  const [result1, query2, result3] = (await connection.batchQueryRaw(
    "DO NULL; SELECT 1, 2; DO NULL",
  )) as [PacketOk, PacketResultSet, PacketOk];

  expect(result1.serverStatus).toBe(0x0a);
  expect([...query2.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect(result3.serverStatus).toBe(0x02);

  void connection.close();
});

test(`batchQuery()`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  const [query1, query2] = await connection.batchQuery("SELECT 1, 2; SELECT 3");

  expect([...(query1 ?? [])]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect([...(query2 ?? [])]).toStrictEqual([{ 3: 3 }]);

  void connection.close();
});

test(`batchExecute()`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  const [result1, result2] = await connection.batchExecute("DO NULL; DO NULL");

  expect(result1?.serverStatus).toBe(0x0a);
  expect(result2?.serverStatus).toBe(0x02);

  void connection.close();
});

test(`batchQuery() invalid query`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  try {
    await connection.batchQuery("SELECT!");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);
    expect((error as QueryException).message).toContain("near ''");
  }

  void connection.close();
});

test(`batchQuery() unexpected response type`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  try {
    await connection.batchQuery("DO NULL");
  } catch (error) {
    expect(error).toBeInstanceOf(UnexpectedResponseTypeException);
    expect((error as UnexpectedResponseTypeException).message).toBe(
      "received OK instead of ResultSet response",
    );
  }

  void connection.close();
});

test(`batchExecute() invalid query`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  try {
    await connection.batchExecute("DO NULL!");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);
    expect((error as QueryException).message).toContain("near '!'");
  }

  void connection.close();
});

test(`batchExecute() unexpected response type`, async () => {
  expect.assertions(2);

  const connection = testConnection();

  try {
    await connection.batchExecute("SELECT 123");
  } catch (error) {
    expect(error).toBeInstanceOf(UnexpectedResponseTypeException);
    expect((error as UnexpectedResponseTypeException).message).toBe(
      "received ResultSet instead of OK response",
    );
  }

  void connection.close();
});
