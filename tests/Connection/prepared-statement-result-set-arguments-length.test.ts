import { expect, test } from "vitest";

import { testConnection } from "@Tests/Fixtures/test-connection.js";

type Test = [length: number];

const tests: Test[] = [
  [1],
  [2],
  [4],
  [8],
  [16],
  [32],
  [64],
  [128],
  [256],
  [511],
  [512],
  [513],
  [1024],
  [2048],
  [4096],
];

test.each(tests)("query with parameters length = %j", async (length) => {
  expect.assertions(1);

  const parameters = Array.from<number>({ length }).map(
    (_, index) => `? AS \`p${String(index)}\``,
  );

  const parametersValues = Array.from<number>({
    length,
  }).map((_parameter, parameterIndex) => parameterIndex);

  const connection = testConnection();

  const [...result] = await connection.query(
    `SELECT ${parameters.join(", ")}`,
    parametersValues,
  );

  expect(result).toStrictEqual([
    Object.fromEntries(
      Array.from<number>({ length }).map((_, index) => [
        `p${String(index)}`,
        index,
      ]),
    ),
  ]);

  void connection.close();
});
