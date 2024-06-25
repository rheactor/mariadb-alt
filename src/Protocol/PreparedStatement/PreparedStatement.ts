import { DateFormat } from "@/Formats/DateFormat.js";
import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import { FieldTypes } from "@/Protocol/Enumerations.js";
import type { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
import {
  createInt16LE,
  createInt32LE,
  createInt64LE,
  createInt8,
  createUInt16LE,
  createUInt32LE,
  createUInt64LE,
  createUInt8,
  generateNullBitmap,
  toDatetimeEncoded,
  toStringEncoded,
  toTimeEncoded,
} from "@/Utils/BufferUtil.js";

export type ExecuteArgument =
  | Buffer
  | Date
  | DateFormat
  | DateTimeFormat
  | TimeFormat
  | bigint
  | boolean
  | number
  | string
  | null
  | undefined;

const enum TypeFlag {
  UNSIGNED = 128,
}

function createTypeBuffer(type: number, unsigned = true): Buffer {
  return Buffer.from([type, unsigned ? TypeFlag.UNSIGNED : 0]);
}

export function createExecutePacket(
  preparedStatement: PreparedStatementResponse,
  args: ExecuteArgument[],
) {
  const header = Buffer.allocUnsafe(10);

  // Header.
  header.writeInt8(0x17);
  header.writeInt32LE(preparedStatement.statementId, 1);
  header.writeInt8(0, 5);
  header.writeInt32LE(1, 6);

  const types: Buffer[] = [];
  const values: Buffer[] = [];

  for (let index = 0; index < preparedStatement.parametersCount; index++) {
    const parameter = args[index];

    if (parameter === null || parameter === undefined) {
      types.push(createTypeBuffer(FieldTypes.NULL));
    } else if (typeof parameter === "number") {
      if (Number.isSafeInteger(parameter)) {
        // BIGINT > 0xFFFFFFFF
        if (parameter > 4_294_967_295) {
          values.push(createUInt64LE(BigInt(parameter)));
          types.push(createTypeBuffer(FieldTypes.BIGINT));
        }

        // INT, MEDIUMINT > 0xFFFF
        else if (parameter > 65_535) {
          values.push(createUInt32LE(parameter));
          types.push(createTypeBuffer(FieldTypes.INT));
        }

        // SMALLINT > 0xFF
        else if (parameter > 0xff) {
          values.push(createUInt16LE(parameter));
          types.push(createTypeBuffer(FieldTypes.SMALLINT));
        }

        // TINYINT >= 0
        else if (parameter >= 0) {
          values.push(createUInt8(parameter));
          types.push(createTypeBuffer(FieldTypes.TINYINT));
        }

        // Negative TINYINT >= -0x7F
        else if (parameter >= -0x7f) {
          values.push(createInt8(parameter));
          types.push(createTypeBuffer(FieldTypes.TINYINT, false));
        }

        // Negative SMALLINT >= -0x7FFF
        else if (parameter >= -32_767) {
          values.push(createInt16LE(parameter));
          types.push(createTypeBuffer(FieldTypes.SMALLINT, false));
        }

        // Negative INT, MEDIUMINT >= -0x7FFFFFFF
        else if (parameter >= -2_147_483_647) {
          values.push(createInt32LE(parameter));
          types.push(createTypeBuffer(FieldTypes.INT, false));
        }

        // Negative BIGINT else
        else {
          values.push(createInt64LE(BigInt(parameter)));
          types.push(createTypeBuffer(FieldTypes.BIGINT, false));
        }
      } else {
        values.push(toStringEncoded(parameter.toString()));
        types.push(createTypeBuffer(FieldTypes.DECIMAL));
      }
    } else if (typeof parameter === "string") {
      values.push(toStringEncoded(parameter));
      types.push(createTypeBuffer(FieldTypes.VARCHAR));
    } else if (typeof parameter === "bigint") {
      if (
        parameter >= -0x7f_ff_ff_ff_ff_ff_ff_ffn &&
        parameter <= 0xff_ff_ff_ff_ff_ff_ff_ffn
      ) {
        values.push(
          parameter >= 0 ? createUInt64LE(parameter) : createInt64LE(parameter),
        );
        types.push(createTypeBuffer(FieldTypes.BIGINT, parameter >= 0));
      } else {
        values.push(toStringEncoded(parameter.toString()));
        types.push(createTypeBuffer(FieldTypes.DECIMAL));
      }
    } else if (parameter instanceof Date) {
      values.push(
        toDatetimeEncoded(
          parameter.getFullYear(),
          parameter.getMonth() + 1,
          parameter.getDate(),
          parameter.getHours(),
          parameter.getMinutes(),
          parameter.getSeconds(),
          parameter.getMilliseconds() * 1000,
        ),
      );
      types.push(createTypeBuffer(FieldTypes.DATETIME));
    } else if (parameter instanceof DateTimeFormat) {
      values.push(
        toDatetimeEncoded(
          parameter.date.year,
          parameter.date.month,
          parameter.date.day,
          parameter.time.hours,
          parameter.time.minutes,
          parameter.time.seconds,
          parameter.time.ms,
        ),
      );
      types.push(createTypeBuffer(FieldTypes.DATETIME));
    } else if (parameter instanceof DateFormat) {
      values.push(
        toDatetimeEncoded(parameter.year, parameter.month, parameter.day),
      );
      types.push(createTypeBuffer(FieldTypes.DATETIME));
    } else if (parameter instanceof TimeFormat) {
      values.push(
        toTimeEncoded(
          parameter.hours,
          parameter.minutes,
          parameter.seconds,
          parameter.ms,
        ),
      );
      types.push(createTypeBuffer(FieldTypes.TIME));
    } else if (typeof parameter === "boolean") {
      values.push(Buffer.from([Number(parameter)]));
      types.push(createTypeBuffer(FieldTypes.TINYINT));
    } else {
      // if (parameter instanceof Buffer)
      values.push(toStringEncoded(parameter));
      types.push(createTypeBuffer(FieldTypes.BLOB));
    }
  }

  return Buffer.concat([
    header,
    generateNullBitmap(args),
    Buffer.from([0x01]),
    ...types,
    ...values,
  ]);
}

export function createClosePacket(statementId: number) {
  return Buffer.concat([Buffer.from([0x19]), createUInt32LE(statementId)]);
}
