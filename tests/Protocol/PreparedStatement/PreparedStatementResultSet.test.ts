import { type Connection } from "@/Connection";
import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { PacketError } from "@/Protocol/Packet/PacketError";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatement";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type QueryUnit = [string, ExecuteArgument | undefined, Row];

  const queryUnits: QueryUnit[] = [
    ["SELECT TRUE, ?", true, { TRUE: 1, "?": 1 }],
    ["SELECT FALSE, ?", false, { FALSE: 0, "?": 0 }],
    ["SELECT ?", 0, { "?": 0 }],
    ["SELECT ?", 0xff, { "?": 0xff }],
    ["SELECT ?", -0x7f, { "?": -0x7f }],
    ["SELECT ?", -0xff, { "?": -0xff }],
    ["SELECT ?", 0xffff, { "?": 0xffff }],
    ["SELECT ?", -0x7fff, { "?": -0x7fff }],
    ["SELECT ?", -0xffff, { "?": -0xffff }],
    ["SELECT ?", 0xffffff, { "?": 0xffffff }],
    ["SELECT ?", -0x7fffff, { "?": -0x7fffff }],
    ["SELECT ?", -0xffffff, { "?": -0xffffff }],
    ["SELECT ?", 0xffffffff, { "?": 0xffffffff }],
    ["SELECT ?", -0x7fffffff, { "?": -0x7fffffff }],
    ["SELECT ?", -0xffffffff, { "?": -0xffffffffn }],
    ["SELECT ?", 0xffffffffffn, { "?": 0xffffffffffn }],
    ["SELECT ?", -0x7fffffffffn, { "?": -0x7fffffffffn }],
    ["SELECT ?", 0xffffffffffffffffn, { "?": 0xffffffffffffffffn }],
    ["SELECT ?", -0x7fffffffffffffffn, { "?": -0x7fffffffffffffffn }],
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
    ["SELECT ?", 1152921504606846975n, { "?": 1152921504606846975n }],
    ["SELECT ?", -1152921504606846975n, { "?": -1152921504606846975n }],
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

  let connectionBase: Connection;

  beforeAll(() => {
    connectionBase = TestConnection();
  });

  describe.each(queryUnits)("query()", (query, input, output) => {
    test(`${query}: ${String(input)}`, async () => {
      const result = await connectionBase.queryDetailed(query, [input]);

      expect(result).toBeInstanceOf(PreparedStatementResultSet);

      if (result instanceof PreparedStatementResultSet) {
        expect([...result.getRows()][0]!).toStrictEqual(output);
      }
    });
  });

  describe("getRows()", () => {
    test("code coverage", async () => {
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
        ])
      );

      expect(resultSet.fieldsCount).toBe(1);

      const field = resultSet.getFields()[0]!;

      expect(field.name).toBe("?");

      expect([...resultSet.getRows()][0]).toStrictEqual({});
    });
  });

  describe("query()", () => {
    test("SELECT fail", async () => {
      const result = await connectionBase.queryDetailed("SELECT!", [123]);

      expect(result).toBeInstanceOf(PacketError);

      if (result instanceof PacketError) {
        expect(result.code).toBe(1064);
        expect(result.message).toContain(
          "You have an error in your SQL syntax;"
        );
      }
    });

    test("SELECT ? without args must fail", async () => {
      const result = await connectionBase.queryDetailed("SELECT ?");

      expect(result).toBeInstanceOf(PacketError);

      if (result instanceof PacketError) {
        expect(result.code).toBe(1064);
        expect(result.message).toContain("'?'");
      }
    });
  });

  afterAll(() => {
    connectionBase.close();
  });
});
