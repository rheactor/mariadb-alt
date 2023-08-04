import { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";

test("new PreparedStatementResponse", () => {
  // Query: "SELECT TRUE, ?".
  const preparedStatementResponse = PreparedStatementResponse.from(
    Buffer.from([
      // Statement ID: 1.
      0x01, 0x00, 0x00, 0x00,
      // Number of fields: 2.
      0x02, 0x00,
      // Number of parameters: 1.
      0x01, 0x00,
      // Unused.
      0x00,
      // Warning count: 2,
      0x02, 0x00,
    ]),
  );

  expect(preparedStatementResponse.statementId).toBe(1);
  expect(preparedStatementResponse.fieldsCount).toBe(2);
  expect(preparedStatementResponse.parametersCount).toBe(1);
  expect(preparedStatementResponse.warningCount).toBe(2);
});
