import { DateFormat } from "@/Formats/DateFormat";
import { DateTimeFormat } from "@/Formats/DateTimeFormat";
import { TimeFormat } from "@/Formats/TimeFormat";
import { FieldTypes } from "@/Protocol/Enumerations";
import { type PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import {
  generateNullBitmap,
  toDatetimeEncoded,
  toStringEncoded,
  toTimeEncoded,
} from "@/Utils/BufferUtil";

export type ExecuteArgument =
  | Buffer
  | Date
  | DateFormat
  | DateTimeFormat
  | TimeFormat
  | bigint
  | number
  | string
  | null
  | undefined;

const enum TypeFlag {
  UNSIGNED = 128,
}

const createTypeBuffer = (type: number, unsigned = false): Buffer => {
  return Buffer.from([type, unsigned ? TypeFlag.UNSIGNED : 0]);
};

export const createExecutePacket = (
  preparedStatement: PreparedStatementResponse,
  args: ExecuteArgument[]
) => {
  const header = Buffer.allocUnsafe(10);

  // Header.
  header.writeInt8(0x17);
  header.writeInt32LE(preparedStatement.statementId, 1);
  header.writeInt8(0, 5);
  header.writeInt32LE(1, 6);

  const types: Buffer[] = [];
  const values: Buffer[] = [];

  for (let i = 0; i < preparedStatement.parametersCount; i++) {
    const parameter = args[i] as ExecuteArgument;

    if (parameter === null || parameter === undefined) {
      types.push(createTypeBuffer(FieldTypes.NULL));
    } else if (typeof parameter === "number") {
      if (Number.isSafeInteger(parameter)) {
        const value = Buffer.alloc(4);

        value.writeInt32LE(parameter);
        values.push(value);
        types.push(createTypeBuffer(FieldTypes.INT, parameter < 0));
      } else {
        values.push(toStringEncoded(parameter.toString()));
        types.push(createTypeBuffer(FieldTypes.DECIMAL));
      }
    } else if (typeof parameter === "string") {
      values.push(toStringEncoded(parameter));
      types.push(createTypeBuffer(FieldTypes.VARCHAR));
    } else if (typeof parameter === "bigint") {
      const value = Buffer.alloc(8);

      value.writeBigInt64LE(parameter);
      values.push(value);
      types.push(createTypeBuffer(FieldTypes.BIGINT, parameter < 0n));
    } else if (parameter instanceof Date) {
      values.push(
        toDatetimeEncoded(
          parameter.getFullYear(),
          parameter.getMonth() + 1,
          parameter.getDate(),
          parameter.getHours(),
          parameter.getMinutes(),
          parameter.getSeconds(),
          parameter.getMilliseconds() * 1000
        )
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
          parameter.time.ms
        )
      );
      types.push(createTypeBuffer(FieldTypes.DATETIME));
    } else if (parameter instanceof DateFormat) {
      values.push(
        toDatetimeEncoded(parameter.year, parameter.month, parameter.day)
      );
      types.push(createTypeBuffer(FieldTypes.DATETIME));
    } else if (parameter instanceof TimeFormat) {
      values.push(
        toTimeEncoded(
          parameter.hours,
          parameter.minutes,
          parameter.seconds,
          parameter.ms
        )
      );
      types.push(createTypeBuffer(FieldTypes.TIME));
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
};
