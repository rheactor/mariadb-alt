import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { QueryException } from "@/Exceptions/QueryException";

test(`execute(): query exception`, async () => {
  expect.assertions(3);

  const connection = TestConnection();

  try {
    await connection.execute("SELECT ?");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);

    if (error instanceof QueryException) {
      expect(error.code).toBe(1064);
      expect(error.message).toContain("'?'");
    }
  }

  void connection.close();
});

test(`execute(): not an ok packet`, async () => {
  expect.assertions(1);

  const connection = TestConnection();

  await expect(async () => connection.execute("SELECT 123")).rejects.toThrow(
    "received ResultSet instead of OK response",
  );

  void connection.close();
});

test(`query(): not a result set packet`, async () => {
  expect.assertions(1);

  const connection = TestConnection();

  await expect(async () => connection.query("DO NULL")).rejects.toThrow(
    "received OK instead of ResultSet response",
  );

  void connection.close();
});
