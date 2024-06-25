import { expect, test } from "vitest";

import { DateFormat } from "@/Formats/DateFormat.js";
import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import type { Field } from "@/Protocol/Data/Field.js";
import { FieldTypes } from "@/Protocol/Enumerations.js";
import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import type { Row } from "@/Protocol/Packet/PacketResultSet.js";
import { PacketResultSet } from "@/Protocol/Packet/PacketResultSet.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";

type Test = [
  query: string,
  metadata: Partial<Field>,
  input: string,
  output:
    | Buffer
    | Date
    | DateFormat
    | DateTimeFormat
    | Record<string, number>
    | string[]
    | TimeFormat
    | bigint
    | boolean
    | number
    | string
    | null,
];

const tests: Test[] = [
  ["TINYINT", { type: FieldTypes.TINYINT }, "123", 123],
  ["TINYINT", { type: FieldTypes.TINYINT }, "-123", -123],
  ["SMALLINT", { type: FieldTypes.SMALLINT }, "123", 123],
  ["MEDIUMINT", { type: FieldTypes.MEDIUMINT }, "123", 123],
  ["INT", { type: FieldTypes.INT }, "123", 123],
  ["BIGINT", { type: FieldTypes.BIGINT }, "123", 123n],
  ["BIT(8)", { type: FieldTypes.BIT, length: 8 }, "123", 123],
  ["BIT(1) NULL", { type: FieldTypes.BIT, length: 1 }, "NULL", null],
  ["BIT(1) NULL", { type: FieldTypes.BIT, length: 1 }, "1", true],
  ["BIT(1) NULL", { type: FieldTypes.BIT, length: 1 }, "FALSE", false],
  ["BIT(14)", { type: FieldTypes.BIT, length: 14 }, "12345", 12_345],
  ["BIT(48)", { type: FieldTypes.BIT, length: 48 }, "12345", 12_345n],
  ["BIT(64)", { type: FieldTypes.BIT, length: 64 }, "12345", 12_345n],
  ["FLOAT", { type: FieldTypes.FLOAT }, "123.45", 123.45],
  ["FLOAT", { type: FieldTypes.FLOAT }, "-123.45", -123.45],
  ["DOUBLE", { type: FieldTypes.DOUBLE }, "123.45", 123.45],
  ["DECIMAL(8,2)", { type: FieldTypes.DECIMAL, decimals: 2 }, "123.45", 123.45],
  ["DECIMAL(10,1)", { type: FieldTypes.DECIMAL, decimals: 1 }, "123.45", 123.5],
  ["VARCHAR(20)", { type: FieldTypes.VARCHAR }, "'example'", "example"],
  ["CHAR(20)", { type: FieldTypes.CHAR }, "'example'", "example"],
  ["TINYTEXT", { type: FieldTypes.BLOB }, "'example'", Buffer.from("example")],
  ["TEXT", { type: FieldTypes.BLOB }, "'example'", Buffer.from("example")],
  [
    "MEDIUMTEXT",
    { type: FieldTypes.BLOB },
    "'example'",
    Buffer.from("example"),
  ],
  ["LONGTEXT", { type: FieldTypes.BLOB }, "'example'", Buffer.from("example")],
  [
    "JSON",
    { type: FieldTypes.BLOB, json: true },
    "'{\"abc\":123}'",
    { abc: 123 },
  ],
  [
    "JSON",
    { type: FieldTypes.BLOB, json: true },
    '\'["a", "b", "c"]\'',
    ["a", "b", "c"],
  ],
  ["JSON", { type: FieldTypes.BLOB, json: true }, "123", 123],
  ["JSON", { type: FieldTypes.BLOB, json: true }, "'false'", false],
  ["JSON NULL", { type: FieldTypes.BLOB, json: true }, "NULL", null],
  [
    "UUID",
    { type: FieldTypes.CHAR, uuid: true },
    "'8424b7ed-c9f3-11ed-96d3-00155dcf574f'",
    "8424b7ed-c9f3-11ed-96d3-00155dcf574f",
  ],
  ["BINARY(10)", { type: FieldTypes.CHAR }, "'exam\0ple'", "exam\0ple\0\0"],
  ["BINARY(11)", { type: FieldTypes.CHAR }, "'exam\0ple'", "exam\0ple\0\0\0"],
  ["VARBINARY(10)", { type: FieldTypes.VARCHAR }, "'exam\0ple'", "exam\0ple"],
  [
    "TINYBLOB",
    { type: FieldTypes.BLOB },
    "'exam\0ple'",
    Buffer.from("exam\0ple"),
  ],
  ["BLOB", { type: FieldTypes.BLOB }, "'exam\0ple'", Buffer.from("exam\0ple")],
  [
    "MEDIUMBLOB",
    { type: FieldTypes.BLOB },
    "'exam\0ple'",
    Buffer.from("exam\0ple"),
  ],
  [
    "LONGBLOB",
    { type: FieldTypes.BLOB },
    "'exam\0ple'",
    Buffer.from("exam\0ple"),
  ],
  [
    "DATE",
    { type: FieldTypes.DATE },
    "'2023-03-04 00:40:52'",
    DateFormat.parse("2023-03-04"),
  ],
  [
    "TIME",
    { type: FieldTypes.TIME },
    "'2023-03-04 00:40:52'",
    TimeFormat.parse("00:40:52"),
  ],
  [
    "TIMESTAMP",
    { type: FieldTypes.TIMESTAMP },
    "'0000-00-00 00:00:00'",
    DateTimeFormat.parse("0000-00-00 00:00:00"),
  ],
  [
    "TIMESTAMP(3)",
    { type: FieldTypes.TIMESTAMP },
    "'1970-01-01 00:00:01.23'",
    DateTimeFormat.parse("1970-01-01 00:00:01.23"),
  ],
  [
    "DATETIME",
    { type: FieldTypes.DATETIME },
    "'1970-01-01 00:00:01.23'",
    DateTimeFormat.parse("1970-01-01 00:00:01.0"),
  ],
  [
    "DATETIME(4)",
    { type: FieldTypes.DATETIME },
    "'1970-01-01 00:00:01.234567'",
    DateTimeFormat.parse("1970-01-01 00:00:01.2345"),
  ],
  ["YEAR", { type: FieldTypes.YEAR }, "23", 2023],
  ["YEAR", { type: FieldTypes.YEAR }, "2023", 2023],
  ["YEAR(2)", { type: FieldTypes.YEAR }, "23", 2023],
  ["YEAR(2)", { type: FieldTypes.YEAR }, "70", 1970],
  ["ENUM('a', 'b', 'c')", { type: FieldTypes.CHAR }, "'a'", "a"],
  ["ENUM('a', 'b', 'c')", { type: FieldTypes.CHAR }, "2", "b"],
  ["ENUM('a') NULL", { type: FieldTypes.CHAR }, "NULL", null],
  [
    "SET('a', 'b', 'c', 'd', 'e')",
    { type: FieldTypes.CHAR },
    "'a,c,e'",
    ["a", "c", "e"],
  ],
  ["SET('a')", { type: FieldTypes.CHAR }, "''", []],
  ["SET('b') NULL", { type: FieldTypes.CHAR }, "NULL", null],
];

interface ResultSet {
  column: Row;
}

test.each(tests)(
  "query %s (metadata: %j) with input %s === %s",
  async (query, metadata, input, output) => {
    // eslint-disable-next-line vitest/prefer-expect-assertions
    expect.assertions(5 + Object.keys(metadata).length);

    const connection = testConnection();

    const table = `test-${String(Math.random())}`;
    const createQuery = await connection.queryRaw(
      `CREATE TEMPORARY TABLE \`${table}\` ( \`column\` ${query} )`,
    );

    expect(createQuery).toBeInstanceOf(PacketOk);

    const insertQuery = await connection.queryRaw(
      `INSERT INTO \`${table}\` (\`column\`) VALUES (${input})`,
    );

    expect(insertQuery).toBeInstanceOf(PacketOk);

    if (insertQuery instanceof PacketOk) {
      expect(insertQuery.affectedRows).toBe(1);
    }

    const selectQuery = await connection.queryRaw(`SELECT * FROM \`${table}\``);

    expect(selectQuery).toBeInstanceOf(PacketResultSet);

    if (selectQuery instanceof PacketResultSet) {
      const metadataFields = selectQuery.getFields();
      const metadataField = metadataFields[0]!;

      for (const fieldProperty of Object.keys(metadataField)) {
        if (fieldProperty in metadata) {
          expect(metadata[fieldProperty as keyof Field]).toBe(
            metadataField[fieldProperty as keyof Field],
          );
        }
      }

      const [selectRow] = [...selectQuery.getRows<ResultSet>()];

      expect(selectRow!.column).toStrictEqual(output);
    }

    void connection.close();
  },
);
