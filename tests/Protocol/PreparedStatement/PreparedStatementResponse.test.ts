import { FieldTypes } from "@/Protocol/Enumerations";
import { PreparedStatementResponse } from "@/Protocol/PreparedStatement/PreparedStatementResponse";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  test("new PreparedStatementResponse", () => {
    // Query: "SELECT TRUE, ?".
    const preparedStatementResponse = new PreparedStatementResponse(
      Buffer.from([
        // First 4-bytes is just ignored (it refer to Packet length + sequence).
        0x0c, 0x00, 0x00, 0x01,
        // The 0x00 response type mean a Prepared Statement Response.
        0x00,
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
        //
        // Parameter #1: skip header.
        0x18, 0x00, 0x00, 0x02, 0x03, 0x64, 0x65, 0x66, 0x00, 0x00, 0x00,
        // Name: "?"
        0x01, 0x3f, 0x00, 0x00, 0x0c,
        // Collate: binary.
        0x3f, 0x00,
        // Length: 0.
        0x00, 0x00, 0x00, 0x00,
        // Type: NULL.
        0x06,
        // Flags.
        0x80, 0x00,
        // Decimals: 0.
        0x00,
        // Unused.
        0x00, 0x00,
        //
        // Field #1: skip header.
        0x1b, 0x00, 0x00, 0x03, 0x03, 0x64, 0x65, 0x66, 0x00, 0x00, 0x00,
        // Name: "TRUE"
        0x04, 0x54, 0x52, 0x55, 0x45, 0x00, 0x00, 0x0c,
        // Collate: binary.
        0x3f, 0x00,
        // Length: 0.
        0x00, 0x00, 0x00, 0x00,
        // Type: INT.
        0x03,
        // Flags.
        0x81, 0x00,
        // Decimals: 0.
        0x00,
        // Unused.
        0x00, 0x00,
        //
        // Field #2: skip header.
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        // Name: "?"
        0x01, 0x3f, 0x00, 0x00, 0x0c,
        // Collate: binary.
        0x3f, 0x00,
        // Length: 0.
        0x00, 0x00, 0x00, 0x00,
        // Type: NULL.
        0x06,
        // Flags.
        0x80, 0x00,
        // Decimals: 0.
        0x00,
        // Unused.
        0x00, 0x00,
      ])
    );

    expect(preparedStatementResponse.statementId).toBe(1);
    expect(preparedStatementResponse.fieldsCount).toBe(2);
    expect(preparedStatementResponse.parametersCount).toBe(1);
    expect(preparedStatementResponse.warningCount).toBe(2);

    const fields = preparedStatementResponse.getFields();
    const field1 = fields[0]!;
    const field2 = fields[1]!;

    const parameters = preparedStatementResponse.getParameters();
    const parameter1 = parameters[0]!;

    expect(field1.name).toBe("TRUE");
    expect(field1.type).toBe(FieldTypes.INT);

    expect(field2.name).toBe("?");
    expect(field2.type).toBe(FieldTypes.NULL);

    expect(parameter1.name).toBe("?");
    expect(parameter1.type).toBe(FieldTypes.NULL);

    const fieldsCached = preparedStatementResponse.getFields();

    expect(fieldsCached).toBe(fields);
  });
});
