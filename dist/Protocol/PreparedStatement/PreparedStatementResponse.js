export class PreparedStatementResponse{constructor(t,e,n,r){this.statementId=t,this.fieldsCount=e,this.parametersCount=n,this.warningCount=r}static from(t){return new PreparedStatementResponse(t.readUint32LE(),t.readUint16LE(4),t.readUint16LE(6),t.readUint16LE(9))}}