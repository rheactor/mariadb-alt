import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

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
    (_, index) => `? AS \`p${index}\``,
  );

  const parametersValues = Array.from<number>({
    length,
  }).map((_parameter, parameterIndex) => parameterIndex);

  const connection = TestConnection();

  const [...result] = await connection.query(
    `SELECT ${parameters.join(", ")}`,
    parametersValues,
  );

  expect(result).toStrictEqual([
    Object.fromEntries(
      Array.from<number>({ length }).map((_, index) => [`p${index}`, index]),
    ),
  ]);

  void connection.close();
});
