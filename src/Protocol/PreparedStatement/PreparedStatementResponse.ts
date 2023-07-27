export class PreparedStatementResponse {
  public constructor(
    public statementId: number,
    public fieldsCount: number,
    public parametersCount: number,
    public warningCount: number,
  ) {}

  public static from(packet: Buffer) {
    return new PreparedStatementResponse(
      packet.readUint32LE(),
      packet.readUint16LE(4),
      packet.readUint16LE(6),
      packet.readUint16LE(9),
    );
  }
}
