import { DateFormat } from "@/Formats/DateFormat.js";
import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import type { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse.js";
export type ExecuteArgument = Buffer | Date | DateFormat | DateTimeFormat | TimeFormat | bigint | boolean | number | string | null | undefined;
export declare function createExecutePacket(preparedStatement: PreparedStatementResponse, args: ExecuteArgument[]): Buffer;
export declare function createClosePacket(statementId: number): Buffer;
