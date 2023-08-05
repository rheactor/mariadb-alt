import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { QueryException } from "@/Exceptions/QueryException";
import { UnexpectedResponseTypeException } from "@/Exceptions/UnexpectedResponseTypeException";
import { type PacketOk } from "@/Protocol/Packet/PacketOk";
import { type PacketResultSet } from "@/Protocol/Packet/PacketResultSet";

test(`batchQueryRaw() with only PacketResultSet`, async () => {
  expect.assertions(2);

  const [query1, query2] = (await TestConnection().batchQueryRaw(
    "SELECT 1, 2; SELECT 3",
  )) as [PacketResultSet, PacketResultSet];

  expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect([...query2.getRows()]).toStrictEqual([{ 3: 3 }]);
});

test(`batchQueryRaw() with only PacketOK`, async () => {
  expect.assertions(2);

  const [result1, result2] = (await TestConnection().batchQueryRaw(
    "DO NULL; DO NULL",
  )) as [PacketOk, PacketOk];

  expect(result1.serverStatus).toBe(0x0a);
  expect(result2.serverStatus).toBe(0x02);
});

test(`batchQueryRaw() mixing PacketOK and PacketResultSet #1`, async () => {
  expect.assertions(3);

  const [query1, result2, query3] = (await TestConnection().batchQueryRaw(
    "SELECT 1, 2; DO NULL; SELECT 3",
  )) as [PacketResultSet, PacketOk, PacketResultSet];

  expect([...query1.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect(result2.serverStatus).toBe(0x0a);
  expect([...query3.getRows()]).toStrictEqual([{ 3: 3 }]);
});

test(`batchQueryRaw() mixing PacketOK and PacketResultSet #2`, async () => {
  expect.assertions(3);

  const [result1, query2, result3] = (await TestConnection().batchQueryRaw(
    "DO NULL; SELECT 1, 2; DO NULL",
  )) as [PacketOk, PacketResultSet, PacketOk];

  expect(result1.serverStatus).toBe(0x0a);
  expect([...query2.getRows()]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect(result3.serverStatus).toBe(0x02);
});

test(`batchQuery()`, async () => {
  expect.assertions(2);

  const [query1, query2] = await TestConnection().batchQuery(
    "SELECT 1, 2; SELECT 3",
  );

  expect([...(query1 ?? [])]).toStrictEqual([{ 1: 1, 2: 2 }]);
  expect([...(query2 ?? [])]).toStrictEqual([{ 3: 3 }]);
});

test(`batchExecute()`, async () => {
  expect.assertions(2);

  const [result1, result2] = await TestConnection().batchExecute(
    "DO NULL; DO NULL",
  );

  expect(result1?.serverStatus).toBe(0x0a);
  expect(result2?.serverStatus).toBe(0x02);
});

test(`batchQuery() invalid query`, async () => {
  expect.assertions(2);

  try {
    await TestConnection().batchQuery("SELECT!");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);
    expect((error as QueryException).message).toContain("near ''");
  }
});

test(`batchQuery() unexpected response type`, async () => {
  expect.assertions(2);

  try {
    await TestConnection().batchQuery("DO NULL");
  } catch (error) {
    expect(error).toBeInstanceOf(UnexpectedResponseTypeException);
    expect((error as UnexpectedResponseTypeException).message).toBe(
      "received OK instead of ResultSet response",
    );
  }
});

test(`batchExecute() invalid query`, async () => {
  expect.assertions(2);

  try {
    await TestConnection().batchExecute("DO NULL!");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);
    expect((error as QueryException).message).toContain("near '!'");
  }
});

test(`batchExecute() unexpected response type`, async () => {
  expect.assertions(2);

  try {
    await TestConnection().batchExecute("SELECT 123");
  } catch (error) {
    expect(error).toBeInstanceOf(UnexpectedResponseTypeException);
    expect((error as UnexpectedResponseTypeException).message).toBe(
      "received ResultSet instead of OK response",
    );
  }
});
