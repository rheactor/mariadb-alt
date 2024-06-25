import type { DateTimeFormat } from "@/Formats/DateTimeFormat.js";
import type { TimeFormat } from "@/Formats/TimeFormat.js";
export declare class BufferConsumer {
    #private;
    constructor(buffer: Buffer, byteOffset?: number);
    at(byteOffset?: number): number;
    readUInt(byteLength?: number): number;
    readInt(byteLength?: number): number;
    readUBigInt(): bigint;
    readBigInt(): bigint;
    readIntEncoded(): bigint | number | null;
    readBoolean(): boolean;
    readNullTerminatedString(): Buffer;
    readString(bytes: number, nullTerminated?: boolean): Buffer;
    readStringEncoded(): Buffer | null;
    readDatetimeEncoded(): DateTimeFormat;
    readTimeEncoded(): TimeFormat;
    slice(bytes: number): Buffer;
    skip(bytes?: number): this;
    skipStringEncoded(): this;
    consumed(): boolean;
}
