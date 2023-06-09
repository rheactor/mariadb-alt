import { type Connection } from "@/Connection";
import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { type Field } from "@/Protocol/Data/Field";
import { FieldTypes } from "@/Protocol/Enumerations";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import { PacketResultSet, type Row } from "@/Protocol/Packet/PacketResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  let connectionBase: Connection;

  beforeAll(() => {
    connectionBase = TestConnection();
  });

  interface PacketUnit {
    query: string;
    metadata: Partial<Field>;
    input: string;
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
      | null;
  }

  const packetUnits: PacketUnit[] = [
    {
      query: "TINYINT",
      metadata: { type: FieldTypes.TINYINT },
      input: "123",
      output: 123,
    },
    {
      query: "TINYINT",
      metadata: { type: FieldTypes.TINYINT },
      input: "-123",
      output: -123,
    },
    {
      query: "SMALLINT",
      metadata: { type: FieldTypes.SMALLINT },
      input: "123",
      output: 123,
    },
    {
      query: "MEDIUMINT",
      metadata: { type: FieldTypes.MEDIUMINT },
      input: "123",
      output: 123,
    },
    {
      query: "INT",
      metadata: { type: FieldTypes.INT },
      input: "123",
      output: 123,
    },
    {
      query: "BIGINT",
      metadata: { type: FieldTypes.BIGINT },
      input: "123",
      output: 123n,
    },
    {
      query: "BIT(8)",
      metadata: { type: FieldTypes.BIT, length: 8 },
      input: "123",
      output: 123,
    },
    {
      query: "BIT(1) NULL",
      metadata: { type: FieldTypes.BIT, length: 1 },
      input: "NULL",
      output: null,
    },
    {
      query: "BIT(1) NULL",
      metadata: { type: FieldTypes.BIT, length: 1 },
      input: "1",
      output: true,
    },
    {
      query: "BIT(1) NULL",
      metadata: { type: FieldTypes.BIT, length: 1 },
      input: "FALSE",
      output: false,
    },
    {
      query: "BIT(14)",
      metadata: { type: FieldTypes.BIT, length: 14 },
      input: "12345",
      output: 12345,
    },
    {
      query: "BIT(48)",
      metadata: { type: FieldTypes.BIT, length: 48 },
      input: "12345",
      output: 12345n,
    },
    {
      query: "BIT(64)",
      metadata: { type: FieldTypes.BIT, length: 64 },
      input: "12345",
      output: 12345n,
    },
    {
      query: "FLOAT",
      metadata: { type: FieldTypes.FLOAT },
      input: "123.45",
      output: 123.45,
    },
    {
      query: "FLOAT",
      metadata: { type: FieldTypes.FLOAT },
      input: "-123.45",
      output: -123.45,
    },
    {
      query: "DOUBLE",
      metadata: { type: FieldTypes.DOUBLE },
      input: "123.45",
      output: 123.45,
    },
    {
      query: "DECIMAL(8,2)",
      metadata: { type: FieldTypes.DECIMAL, decimals: 2 },
      input: "123.45",
      output: 123.45,
    },
    {
      query: "DECIMAL(10,1)",
      metadata: { type: FieldTypes.DECIMAL, decimals: 1 },
      input: "123.45",
      output: 123.5,
    },
    {
      query: "VARCHAR(20)",
      metadata: { type: FieldTypes.VARCHAR },
      input: "'example'",
      output: "example",
    },
    {
      query: "CHAR(20)",
      metadata: { type: FieldTypes.CHAR },
      input: "'example'",
      output: "example",
    },
    {
      query: "TINYTEXT",
      metadata: { type: FieldTypes.BLOB },
      input: "'example'",
      output: Buffer.from("example"),
    },
    {
      query: "TEXT",
      metadata: { type: FieldTypes.BLOB },
      input: "'example'",
      output: Buffer.from("example"),
    },
    {
      query: "MEDIUMTEXT",
      metadata: { type: FieldTypes.BLOB },
      input: "'example'",
      output: Buffer.from("example"),
    },
    {
      query: "LONGTEXT",
      metadata: { type: FieldTypes.BLOB },
      input: "'example'",
      output: Buffer.from("example"),
    },
    {
      query: "JSON",
      metadata: { type: FieldTypes.BLOB, json: true },
      input: "'{\"abc\":123}'",
      output: { abc: 123 },
    },
    {
      query: "JSON",
      metadata: { type: FieldTypes.BLOB, json: true },
      input: '\'["a", "b", "c"]\'',
      output: ["a", "b", "c"],
    },
    {
      query: "JSON",
      metadata: { type: FieldTypes.BLOB, json: true },
      input: "123",
      output: 123,
    },
    {
      query: "JSON",
      metadata: { type: FieldTypes.BLOB, json: true },
      input: "'false'",
      output: false,
    },
    {
      query: "JSON NULL",
      metadata: { type: FieldTypes.BLOB, json: true },
      input: "NULL",
      output: null,
    },
    {
      query: "UUID",
      metadata: { type: FieldTypes.CHAR, uuid: true },
      input: "'8424b7ed-c9f3-11ed-96d3-00155dcf574f'",
      output: "8424b7ed-c9f3-11ed-96d3-00155dcf574f",
    },
    {
      query: "BINARY(10)",
      metadata: { type: FieldTypes.CHAR },
      input: "'exa\0ple'",
      output: "exa\0ple\0\0\0",
    },
    {
      query: "VARBINARY(10)",
      metadata: { type: FieldTypes.VARCHAR },
      input: "'exa\0ple'",
      output: "exa\0ple",
    },
    {
      query: "TINYBLOB",
      metadata: { type: FieldTypes.BLOB },
      input: "'exa\0ple'",
      output: Buffer.from("exa\0ple"),
    },
    {
      query: "BLOB",
      metadata: { type: FieldTypes.BLOB },
      input: "'exa\0ple'",
      output: Buffer.from("exa\0ple"),
    },
    {
      query: "MEDIUMBLOB",
      metadata: { type: FieldTypes.BLOB },
      input: "'exa\0ple'",
      output: Buffer.from("exa\0ple"),
    },
    {
      query: "LONGBLOB",
      metadata: { type: FieldTypes.BLOB },
      input: "'exa\0ple'",
      output: Buffer.from("exa\0ple"),
    },
    {
      query: "DATE",
      metadata: { type: FieldTypes.DATE },
      input: "'2023-03-04 00:40:52'",
      output: DateFormat.parse("2023-03-04"),
    },
    {
      query: "TIME",
      metadata: { type: FieldTypes.TIME },
      input: "'2023-03-04 00:40:52'",
      output: TimeFormat.parse("00:40:52"),
    },
    {
      query: "TIMESTAMP",
      metadata: { type: FieldTypes.TIMESTAMP },
      input: "'0000-00-00 00:00:00'",
      output: DateTimeFormat.parse("0000-00-00 00:00:00"),
    },
    {
      query: "TIMESTAMP(3)",
      metadata: { type: FieldTypes.TIMESTAMP },
      input: "'1970-01-01 00:00:01.23'",
      output: DateTimeFormat.parse("1970-01-01 00:00:01.23"),
    },
    {
      query: "DATETIME",
      metadata: { type: FieldTypes.DATETIME },
      input: "'1970-01-01 00:00:01.23'",
      output: DateTimeFormat.parse("1970-01-01 00:00:01.0"),
    },
    {
      query: "DATETIME(4)",
      metadata: { type: FieldTypes.DATETIME },
      input: "'1970-01-01 00:00:01.234567'",
      output: DateTimeFormat.parse("1970-01-01 00:00:01.2345"),
    },
    {
      query: "YEAR",
      metadata: { type: FieldTypes.YEAR },
      input: "23",
      output: 2023,
    },
    {
      query: "YEAR",
      metadata: { type: FieldTypes.YEAR },
      input: "2023",
      output: 2023,
    },
    {
      query: "YEAR(2)",
      metadata: { type: FieldTypes.YEAR },
      input: "23",
      output: 2023,
    },
    {
      query: "YEAR(2)",
      metadata: { type: FieldTypes.YEAR },
      input: "70",
      output: 1970,
    },
    {
      query: "ENUM('a', 'b', 'c')",
      metadata: { type: FieldTypes.CHAR },
      input: "'a'",
      output: "a",
    },
    {
      query: "ENUM('a', 'b', 'c')",
      metadata: { type: FieldTypes.CHAR },
      input: "2",
      output: "b",
    },
    {
      query: "ENUM('a') NULL",
      metadata: { type: FieldTypes.CHAR },
      input: "NULL",
      output: null,
    },
    {
      query: "SET('a', 'b', 'c', 'd', 'e')",
      metadata: { type: FieldTypes.CHAR },
      input: "'a,c,e'",
      output: ["a", "c", "e"],
    },
    {
      query: "SET('a')",
      metadata: { type: FieldTypes.CHAR },
      input: "''",
      output: [],
    },
    {
      query: "SET('b') NULL",
      metadata: { type: FieldTypes.CHAR },
      input: "NULL",
      output: null,
    },
  ];

  describe.each(packetUnits)("getRows()", (packetUnit) => {
    interface ResultSet {
      column: Row;
    }

    test(`field type "${packetUnit.query}" = ${packetUnit.input}`, async () => {
      const table = `test-${Math.random()}`;
      const createQuery = await connectionBase.queryRaw(
        `CREATE TEMPORARY TABLE \`${table}\` ( \`column\` ${packetUnit.query} )`
      );

      expect(createQuery).toBeInstanceOf(PacketOk);

      const insertQuery = await connectionBase.queryRaw(
        `INSERT INTO \`${table}\` (\`column\`) VALUES (${packetUnit.input})`
      );

      expect(insertQuery).toBeInstanceOf(PacketOk);

      if (insertQuery instanceof PacketOk) {
        expect(insertQuery.affectedRows).toBe(1);
      }

      const selectQuery = await connectionBase.queryRaw(
        `SELECT * FROM \`${table}\``
      );

      expect(selectQuery).toBeInstanceOf(PacketResultSet);

      if (selectQuery instanceof PacketResultSet) {
        const metadata = selectQuery.getFields();
        const field = metadata[0]!;

        for (const fieldProperty of Object.keys(field)) {
          if (fieldProperty in packetUnit.metadata) {
            expect(packetUnit.metadata[fieldProperty as keyof Field]).toBe(
              field[fieldProperty as keyof Field]
            );
          }
        }

        const [selectRow] = [...selectQuery.getRows<ResultSet>()];

        expect(selectRow!.column).toStrictEqual(packetUnit.output);
      }
    });
  });

  describe("transform() coverage", () => {
    test("unknown field type", () => {
      expect(
        PacketResultSet.transform(
          [Buffer.from("")],
          [
            {
              type: -1,
              name: "unknown",
              collation: -1,
              flags: -1,
              length: -1,
              decimals: -1,
              json: false,
              uuid: false,
            },
          ]
        )
      ).toStrictEqual({});
    });

    test("unknown extended metadata", () => {
      const packetResultSet = new PacketResultSet(
        Buffer.from([
          // Fields count: 1.
          0x01,
          // Field #1 catalog, database, table alias, table: empty.
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          // Field #1 column name alias: "unknown".
          0x07, 0x75, 0x6e, 0x6b, 0x6e, 0x6f, 0x77, 0x6e,
          // Field #1 column name: empty.
          0x00,
          // Field extended metadata length: 8.
          0x08,
          // Field extended metadata #1 type: 0 (mean "format").
          0x00,
          // Field extended metadata #1 value: "unknown".
          0x75, 0x6e, 0x6b, 0x6e, 0x6f, 0x77, 0x6e,
          // Length of fixed fields: always 0x0C.
          0x0c,
          // Collation: just ignore.
          0x00, 0x00,
          // Max column size: just ignore.
          0x00, 0x00, 0x00, 0x00,
          // Field type: just ignore.
          0x00,
          // Field detail flag: just ignore.
          0x00, 0x00,
          // Field decimals: just ignore.
          0x00,
          // Unused.
          0x00, 0x00,
        ])
      );

      expect(packetResultSet.getFields()).toStrictEqual([
        {
          type: 0,
          name: "unknown",
          collation: 0,
          flags: 0,
          length: 0,
          decimals: 0,
          json: false,
          uuid: false,
        },
      ]);
    });
  });

  afterAll(() => {
    connectionBase.close();
  });
});
