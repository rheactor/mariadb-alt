import { type Connection } from "@/Connection";
import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { PacketErrorState } from "@/Protocol/Packet/PacketErrorState";
import { type Row } from "@/Protocol/Packet/PacketResultSet";
import { type ExecuteArgument } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  type QueryUnit = [string, ExecuteArgument[] | undefined, Row];

  const queryUnits: QueryUnit[] = [
    ["SELECT TRUE, ?", [123], { TRUE: 1, "?": 123 }],
    ["SELECT TRUE AS a, ? AS b", [123], { a: 1, b: 123 }],
    ["SELECT ? AS a, FALSE as b", [123], { a: 123, b: 0 }],
    ["SELECT ?", [-123], { "?": -123 }],
    ["SELECT ?", [null], { "?": null }],
    ["SELECT ?", ["123"], { "?": "123" }],
    ["SELECT ?", [Buffer.from("123")], { "?": Buffer.from("123") }],
    ["SELECT 123, ?", [null], { 123: 123, "?": null }],
    ["SELECT ?, 123", [null], { 123: 123, "?": null }],
    ["SELECT ? AS a, ? AS b", [null, 123], { a: null, b: 123 }],
    ["SELECT ? AS a, ? AS b", [123, null], { a: 123, b: null }],
    ["SELECT ?", [123.45], { "?": 123.45 }],
    ["SELECT ?", [-123.45], { "?": -123.45 }],
    ["SELECT ?", [1152921504606846975n], { "?": 1152921504606846975n }],
    ["SELECT ?", [-1152921504606846975n], { "?": -1152921504606846975n }],
    ["SELECT HEX(?)", ["example"], { "HEX(?)": "6578616D706C65" }],

    [
      "SELECT CONCAT(x'4578616D706C65', ?)",
      ["Example"],
      { "CONCAT(x'4578616D706C65', ?)": "ExampleExample" },
    ],
    [
      "SELECT ?",
      [new Date("2023-04-03T10:20:30.1234")],
      { "?": DateTimeFormat.parse("2023-04-03 10:20:30.123") },
    ],
    [
      "SELECT ?",
      [new Date("2023-04-03T10:20:30.00012")],
      { "?": DateTimeFormat.parse("2023-04-03 10:20:30") },
    ],
    [
      "SELECT ?",
      [DateTimeFormat.parse("2023-04-03 10:20:30.123456")],
      { "?": DateTimeFormat.parse("2023-04-03 10:20:30.123456") },
    ],
    [
      "SELECT ?",
      [DateFormat.parse("2023-04-03")],
      { "?": DateTimeFormat.parse("2023-04-03 00:00:00") },
    ],
    [
      "SELECT ?",
      [TimeFormat.parse("00:00:00")],
      { "?": TimeFormat.parse("00:00:00") },
    ],
    [
      "SELECT ?",
      [TimeFormat.parse("10:20:30.123456")],
      { "?": TimeFormat.parse("10:20:30.123456") },
    ],
    [
      "SELECT ?",
      [TimeFormat.parse("838:59:59")],
      { "?": TimeFormat.parse("838:59:59") },
    ],
    [
      "SELECT ?",
      [TimeFormat.parse("-838:59:59")],
      { "?": TimeFormat.parse("-838:59:59") },
    ],
  ];

  let connectionBase: Connection;

  beforeAll(() => {
    connectionBase = TestConnection();
  });

  describe.each(queryUnits)("query()", (query, args, output) => {
    test(query, async () => {
      const result = await connectionBase.queryDetailed(query, args);

      expect(result).toBeInstanceOf(PreparedStatementResultSet);

      if (result instanceof PreparedStatementResultSet) {
        expect([...result.getRows()][0]!).toStrictEqual(output);
      }
    });
  });

  describe("getRows()", () => {
    test("code coverage", async () => {
      const buffer = Buffer.from([
        // Packet Length (1), Packet Number (1), Number of Fields (1):
        0x01, 0x00, 0x00, 0x01, 0x01,
        // Field packet:
        // Packet Length (24), Packet Number (1), Catalog ("def"):
        0x18, 0x00, 0x00, 0x02, 0x03, 0x64, 0x65, 0x66,
        // Database (null), Table (null), Original Table (null):
        0x00, 0x00, 0x00,
        // Column name: "?", Original Name (null):
        0x01, 0x3f, 0x00,
        // Skip (1 byte), Length (always 12):
        0x00, 0x0c,
        // Encoding ("utf8mb4_general_ci"):
        0x2d, 0x00,
        // Length (12):
        0x0c, 0x00, 0x00, 0x00,
        // Field Type (0 = undefined):
        0x00,
        // Flags, Decimals (39), Skip (2 bytes):
        0x01, 0x00, 0x27, 0x00, 0x00,
        // Row Packet
        // Packet Length (6), Packet Number (3), Response Code (OK):
        0x06, 0x00, 0x00, 0x03, 0x00,
        // Null Bitmap:
        0x00,
        // Value will not be defined intentionally here.
        // EOF Packet
        // Packet Length (7), Packet Number (4), Response Code (EOF):
        0x07, 0x00, 0x00, 0x04, 0xfe,
      ]);

      const resultSet = new PreparedStatementResultSet(buffer);

      expect(resultSet.fieldsCount).toBe(1);

      const field = resultSet.getFields()[0]!;

      expect(field.name).toBe("?");

      expect([...resultSet.getRows()][0]).toStrictEqual({});
    });
  });

  describe("query()", () => {
    test("SELECT fail", async () => {
      const result = await connectionBase.queryDetailed("SELECT!", [123]);

      expect(result).toBeInstanceOf(PacketErrorState);

      if (result instanceof PacketErrorState) {
        expect(result.code).toBe(1064);
        expect(result.message).toContain(
          "You have an error in your SQL syntax;"
        );
      }
    });

    test("SELECT ? without args must fail", async () => {
      const result = await connectionBase.queryDetailed("SELECT ?");

      expect(result).toBeInstanceOf(PacketErrorState);

      if (result instanceof PacketErrorState) {
        expect(result.code).toBe(1064);
        expect(result.message).toContain("'?'");
      }
    });
  });

  afterAll(() => {
    connectionBase.close();
  });
});
