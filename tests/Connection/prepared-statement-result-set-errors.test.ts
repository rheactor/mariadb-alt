import { expect, test } from "vitest";

import { FewArgumentsException } from "@/Exceptions/FewArgumentsException.js";
import { QueryException } from "@/Exceptions/QueryException.js";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";

test("code coverage: unknown data type response", () => {
  const resultSet = new PreparedStatementResultSet(
    Buffer.from([
      // Number of Fields (1):
      0x01,

      // Field #1:
      // Field headers: catalog ("def"), database, table alias, table: empty.
      0x03, 0x64, 0x65, 0x66, 0x00, 0x00, 0x00,
      // Column name alias: "?".
      0x01, 0x3f,
      // Column name: empty.
      0x00,
      // Extended metadata: empty.
      0x00,
      // Length: always 0x0c.
      0x0c,
      // Encoding ("utf8mb4_general_ci"):
      0x2d, 0x00,
      // Length (12):
      0x0c, 0x00, 0x00, 0x00,
      // Field type: 0 (undefined).
      0x00,
      // Flags: none, decimals: 39.
      0x00, 0x00, 0x27,
      // Unused.
      0x00, 0x00,

      // Row #1:
      // Header:
      0x00,
      // Null bitmap: none.
      0x00,
      // Value is NULL, so no more data here.
    ]),
  );

  expect(resultSet.fieldsCount).toBe(1);

  const field = resultSet.getFields()[0]!;

  expect(field.name).toBe("?");
  expect([...resultSet.getRows()][0]).toStrictEqual({});
});

test("query SELECT fail", async () => {
  expect.assertions(3);

  const connection = testConnection();

  try {
    await connection.queryRaw("SELECT!", [123]);
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);

    if (error instanceof QueryException) {
      expect(error.code).toBe(1064);
      expect(error.message).toContain("You have an error in your SQL syntax;");
    }
  }

  void connection.close();
});

test("query SELECT ? without args must fail", async () => {
  expect.assertions(3);

  const connection = testConnection();

  try {
    await connection.queryRaw("SELECT ?");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryException);

    if (error instanceof QueryException) {
      expect(error.code).toBe(1064);
      expect(error.message).toContain("'?'");
    }
  }

  void connection.close();
});

test("query SELECT PS with few arguments", async () => {
  expect.assertions(4);

  const connection = testConnection();

  try {
    await connection.queryRaw("SELECT ?, ?", [123]);
  } catch (error) {
    expect(error).toBeInstanceOf(FewArgumentsException);
    expect((error as FewArgumentsException).message).toBe(
      "Prepared Statement number of arguments is 2, but received 1",
    );
    expect((error as FewArgumentsException).details.received).toBe(1);
    expect((error as FewArgumentsException).details.required).toBe(2);
  }

  void connection.close();
});

test("query SELECT +64K arguments must throw error", () => {
  expect.assertions(1);

  const parameters = Array.from<null>({ length: 0xff_ff + 1 }).fill(null);

  const connection = testConnection();

  void expect(async () => {
    await connection.queryRaw("DO NULL", parameters);
  }).rejects.toThrow("Prepared Statements supports only 65535 arguments");

  void connection.close();
});
