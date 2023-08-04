import { TestConnection } from "@Tests/Fixtures/test-connection";

import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";

type Test = [query: string, args: ExecuteArgument | undefined, response: Row];

const tests: Test[] = [
  ["SELECT TRUE, ?", true, { TRUE: 1, "?": 1 }],
  ["SELECT FALSE, ?", false, { FALSE: 0, "?": 0 }],
  ["SELECT ?", 0, { "?": 0 }],
  ["SELECT ?", 0xff, { "?": 0xff }],
  ["SELECT ?", -0x7f, { "?": -0x7f }],
  ["SELECT ?", -0xff, { "?": -0xff }],
  ["SELECT ?", 0xff_ff, { "?": 0xff_ff }],
  ["SELECT ?", -0x7f_ff, { "?": -0x7f_ff }],
  ["SELECT ?", -0xff_ff, { "?": -0xff_ff }],
  ["SELECT ?", 0xff_ff_ff, { "?": 0xff_ff_ff }],
  ["SELECT ?", -0x7f_ff_ff, { "?": -0x7f_ff_ff }],
  ["SELECT ?", -0xff_ff_ff, { "?": -0xff_ff_ff }],
  ["SELECT ?", 0xff_ff_ff_ff, { "?": 0xff_ff_ff_ff }],
  ["SELECT ?", -0x7f_ff_ff_ff, { "?": -0x7f_ff_ff_ff }],
  ["SELECT ?", -0xff_ff_ff_ff, { "?": -0xff_ff_ff_ff }],
  ["SELECT ?", 0xff_ff_ff_ff_ffn, { "?": 0xff_ff_ff_ff_ff }],
  ["SELECT ?", -0x7f_ff_ff_ff_ffn, { "?": -0x7f_ff_ff_ff_ff }],
  ["SELECT ?", 0xff_ff_ff_ff_ff_ff_ff_ffn, { "?": 0xff_ff_ff_ff_ff_ff_ff_ffn }],
  [
    "SELECT ?",
    -0x7f_ff_ff_ff_ff_ff_ff_ffn,
    { "?": -0x7f_ff_ff_ff_ff_ff_ff_ffn },
  ],
  [
    "SELECT ?",
    -0xff_ff_ff_ff_ff_ff_ff_ffn,
    { "?": -0xff_ff_ff_ff_ff_ff_ff_ffn },
  ],
  [
    "SELECT ?",
    0xff_ff_ff_ff_ff_ff_ff_ff_ffn,
    { "?": 0xff_ff_ff_ff_ff_ff_ff_ff_ffn },
  ],
  [
    "SELECT ?",
    -0xff_ff_ff_ff_ff_ff_ff_ff_ffn,
    { "?": -0xff_ff_ff_ff_ff_ff_ff_ff_ffn },
  ],
  ["SELECT ?", Number.MIN_SAFE_INTEGER, { "?": Number.MIN_SAFE_INTEGER }],
  ["SELECT ?", Number.MAX_SAFE_INTEGER, { "?": Number.MAX_SAFE_INTEGER }],
  [
    "SELECT ?", // 66 digits, over 65 digits limit of DECIMAL() will works:
    999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999n,
    {
      "?": 999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999_999n,
    },
  ],
  ["SELECT TRUE AS a, ? AS b", 123, { a: 1, b: 123 }],
  ["SELECT ? AS a, FALSE as b", 123, { a: 123, b: 0 }],
  ["SELECT NULL, ?", -123, { NULL: null, "?": -123 }],
  ["SELECT ?", null, { "?": null }],
  ["SELECT ?", "123", { "?": "123" }],
  ["SELECT ?", Buffer.from("123"), { "?": Buffer.from("123") }],
  ["SELECT 123, ?", null, { 123: 123, "?": null }],
  ["SELECT ?, 123", null, { 123: 123, "?": null }],
  ["SELECT ?", 123.45, { "?": 123.45 }],
  ["SELECT ?", -123.45, { "?": -123.45 }],
  ["SELECT ?", 1_152_921_504_606_846_975n, { "?": 1_152_921_504_606_846_975n }],
  [
    "SELECT ?",
    -1_152_921_504_606_846_975n,
    { "?": -1_152_921_504_606_846_975n },
  ],
  ["SELECT HEX(?)", "example", { "HEX(?)": "6578616D706C65" }],
  [
    "SELECT CONCAT(x'4578616D706C65', ?)",
    "Example",
    { "CONCAT(x'4578616D706C65', ?)": "ExampleExample" },
  ],
  [
    "SELECT ?",
    new Date("2023-04-03T10:20:30.1234"),
    { "?": DateTimeFormat.parse("2023-04-03 10:20:30.123") },
  ],
  [
    "SELECT ?",
    new Date("2023-04-03T10:20:30.00012"),
    { "?": DateTimeFormat.parse("2023-04-03 10:20:30") },
  ],
  [
    "SELECT ?",
    DateTimeFormat.parse("2023-04-03 10:20:30.123456"),
    { "?": DateTimeFormat.parse("2023-04-03 10:20:30.123456") },
  ],
  [
    "SELECT ?",
    DateFormat.parse("2023-04-03"),
    { "?": DateTimeFormat.parse("2023-04-03 00:00:00") },
  ],
  [
    "SELECT ?",
    TimeFormat.parse("00:00:00"),
    { "?": TimeFormat.parse("00:00:00") },
  ],
  [
    "SELECT ?",
    TimeFormat.parse("10:20:30.123456"),
    { "?": TimeFormat.parse("10:20:30.123456") },
  ],
  [
    "SELECT ?",
    TimeFormat.parse("838:59:59"),
    { "?": TimeFormat.parse("838:59:59") },
  ],
  [
    "SELECT ?",
    TimeFormat.parse("-838:59:59"),
    { "?": TimeFormat.parse("-838:59:59") },
  ],
];

test.each(tests)("#%# query %j", async (query, input, output) => {
  expect.assertions(2);

  const result = await TestConnection().queryRaw(query, [input]);

  expect(result).toBeInstanceOf(PreparedStatementResultSet);

  if (result instanceof PreparedStatementResultSet) {
    expect([...result.getRows()][0]!).toStrictEqual(output);
  }
});

test(`query SELECT ?, ? with NULL`, async () => {
  expect.assertions(1);

  const [...result] = await TestConnection().query(
    "SELECT NULL AS a, ? AS b, 123 AS c, ? AS d, NULL AS e",
    [null, null],
  );

  expect(result).toStrictEqual([
    { a: null, b: null, c: 123, d: null, e: null },
  ]);
});

test("query SELECT with 64K arguments", async () => {
  expect.assertions(1);

  const parameters = Array.from({ length: 0xff_ff }).fill(9) as number[];

  const [...result] = await TestConnection().query(
    `SELECT ${parameters.map(() => "?").join(",")}`,
    parameters,
  );

  expect(result).toStrictEqual([{ "?": 9 }]);
}, 1000);
