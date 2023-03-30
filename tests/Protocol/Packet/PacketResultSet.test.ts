import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { FieldTypes } from "@/Protocol/Enumerations";
import { PacketOk } from "@/Protocol/Packet/PacketOk";
import {
  PacketResultSet,
  type FieldMetadata,
} from "@/Protocol/Packet/PacketResultSet";
import { TestConnection } from "@Tests/Fixtures/TestConnection";

describe("Protocol/Packet/PacketResultSet", () => {
  const connectionBase = TestConnection();

  interface PacketUnit {
    query: string;
    metadata: Partial<FieldMetadata>;
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
      output: new DateFormat("2023-03-04"),
    },
    {
      query: "TIME",
      metadata: { type: FieldTypes.TIME },
      input: "'2023-03-04 00:40:52'",
      output: new TimeFormat("00:40:52"),
    },
    {
      query: "TIMESTAMP",
      metadata: { type: FieldTypes.TIMESTAMP },
      input: "'0000-00-00 00:00:00'",
      output: new DateTimeFormat("0000-00-00 00:00:00"),
    },
    {
      query: "TIMESTAMP(3)",
      metadata: { type: FieldTypes.TIMESTAMP },
      input: "'1970-01-01 00:00:01.23'",
      output: new DateTimeFormat("1970-01-01 00:00:01.23"),
    },
    {
      query: "DATETIME",
      metadata: { type: FieldTypes.DATETIME },
      input: "'1970-01-01 00:00:01.23'",
      output: new DateTimeFormat("1970-01-01 00:00:01.0"),
    },
    {
      query: "DATETIME(4)",
      metadata: { type: FieldTypes.DATETIME },
      input: "'1970-01-01 00:00:01.234567'",
      output: new DateTimeFormat("1970-01-01 00:00:01.2345"),
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

  describe.each(packetUnits)("getRows() and transform()", (packetUnit) => {
    test(`field type "${packetUnit.query}" = ${packetUnit.input}`, async () => {
      const table = `test-${Math.random()}`;
      const createQuery = await connectionBase.query(
        `CREATE TEMPORARY TABLE \`${table}\` ( \`column\` ${packetUnit.query} )`
      );

      expect(createQuery).toBeInstanceOf(PacketOk);

      const insertQuery = await connectionBase.query(
        `INSERT INTO \`${table}\` (\`column\`) VALUES (${packetUnit.input})`
      );

      expect(insertQuery).toBeInstanceOf(PacketOk);

      if (insertQuery instanceof PacketOk) {
        expect(insertQuery.affectedRows).toBe(1);
      }

      const selectQuery = await connectionBase.query(
        `SELECT * FROM \`${table}\``
      );

      expect(selectQuery).toBeInstanceOf(PacketResultSet);

      if (selectQuery instanceof PacketResultSet) {
        const metadata = selectQuery.getMetadata();
        const field = metadata[0]!;

        for (const fieldProperty of Object.keys(field)) {
          if (fieldProperty in packetUnit.metadata) {
            expect(
              packetUnit.metadata[fieldProperty as keyof FieldMetadata]
            ).toBe(field[fieldProperty as keyof FieldMetadata]);
          }
        }

        const [selectRow] = [...selectQuery.getRows()];
        const selectRowTransformed = PacketResultSet.transform(
          selectRow!,
          metadata
        );

        expect(selectRowTransformed!["column"]).toStrictEqual(
          packetUnit.output
        );
      }
    });
  });

  afterAll(() => {
    connectionBase.close();
  });
});
