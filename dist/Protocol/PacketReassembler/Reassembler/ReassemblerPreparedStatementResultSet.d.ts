import { ReassemblerResultSetPartial } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet.js";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";
export declare class ReassemblerPreparedStatementResultSet extends ReassemblerResultSetPartial {
    get(): PreparedStatementResultSet;
}
