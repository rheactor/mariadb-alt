import type { Field } from "@/Protocol/Data/Field.js";
import type { Row } from "@/Protocol/Packet/PacketResultSet.js";
export declare class PreparedStatementResultSet {
    #private;
    fieldsCount: number;
    constructor(buffer: Buffer);
    getFields(): Field[];
    getRows<T extends object = Row>(): Generator<T, void, unknown>;
}
