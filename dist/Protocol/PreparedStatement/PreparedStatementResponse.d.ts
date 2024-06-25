export declare class PreparedStatementResponse {
    statementId: number;
    fieldsCount: number;
    parametersCount: number;
    warningCount: number;
    constructor(statementId: number, fieldsCount: number, parametersCount: number, warningCount: number);
    static from(packet: Buffer): PreparedStatementResponse;
}
