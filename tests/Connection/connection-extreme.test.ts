import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

test("query SELECT 16MB packet", async () => {
  expect.assertions(1);

  const dataLength = 0xff_ff_ff - 18;
  const data = Buffer.allocUnsafe(dataLength);

  const connection = TestConnection();

  const [result] = await connection.query("SELECT LENGTH(?) AS `length`", [
    data,
  ]);

  expect(result).toStrictEqual({ length: dataLength });

  void connection.close();
});
