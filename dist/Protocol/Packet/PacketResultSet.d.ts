import { DateFormat } from "@/Formats/DateFormat.js";
import { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import { TimeFormat } from "@/Formats/TimeFormat.js";
import type { Field } from "@/Protocol/Data/Field.js";
type RowUnprocessed = Array<Buffer | null>;
export type Row = Record<string, Buffer | Date | DateFormat | DateTimeFormat | string[] | TimeFormat | bigint | boolean | number | string | null>;
export declare class PacketResultSet {
    #private;
    constructor(buffer: Buffer);
    static transform(row: RowUnprocessed, fields: Field[]): Row;
    getFields(): Field[];
    getRowsUnprocessed(): Generator<RowUnprocessed, void, unknown>;
    getRows<T extends object = Row>(): Generator<T, void, unknown>;
}
export {};
