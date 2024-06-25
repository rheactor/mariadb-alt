import { ReassemblerResultSetPartial } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet.js";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet.js";

export class ReassemblerPreparedStatementResultSet extends ReassemblerResultSetPartial {
  public get() {
    return new PreparedStatementResultSet(Buffer.concat(this.packets));
  }
}
