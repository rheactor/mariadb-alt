import { ReassemblerResultSetPartial } from "@/Protocol/PacketReassembler/Reassembler/ReassemblerResultSet";
import { PreparedStatementResultSet } from "@/Protocol/PreparedStatement/PreparedStatementResultSet";

export class ReassemblerPSResultSet extends ReassemblerResultSetPartial {
  public get() {
    return new PreparedStatementResultSet(Buffer.concat(this.packets));
  }
}
