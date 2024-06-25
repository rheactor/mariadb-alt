import { BufferConsumer } from "@/Utils/BufferConsumer.js";
interface FieldExtended {
    json: boolean;
    uuid: boolean;
}
export interface Field extends FieldExtended {
    type: number;
    name: string;
    collation: number;
    flags: number;
    length: number;
    decimals: number;
}
export declare function readField(bufferConsumer: BufferConsumer): Field;
export {};
