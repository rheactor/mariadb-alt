import { TestConnectionPool } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet";

test("option.afterAuthenticated: check sql_mode", async () => {
  expect.assertions(1);

  const connection = TestConnectionPool();

  const [result] = await connection.query<{
    "@@SESSION.sql_mode": string;
  }>("SELECT @@SESSION.sql_mode");

  expect(result).toStrictEqual({
    "@@SESSION.sql_mode":
      "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION",
  });

  void connection.close();
});

test("option.connections: unlimited connections", async () => {
  expect.assertions(2);

  const connection = TestConnectionPool({ connections: undefined });

  const query = await connection.queryRaw("SELECT 1");

  expect(query).toBeInstanceOf(PacketResultSet);

  if (query instanceof PacketResultSet) {
    expect([...query.getRows()]).toStrictEqual([{ "1": 1 }]);
  }

  void connection.close();
});
