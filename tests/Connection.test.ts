import { TestConnection } from "@Tests/Fixtures/TestConnection";

describe("/Connection", () => {
  describe("connection ready", () => {
    test("socket initialization", (done) => {
      expect.assertions(1);

      const connectionBase = TestConnection();

      connectionBase.once("ready", (connection) => {
        expect(connection.isReady()).toBe(true);
        done();
      });

      connectionBase.close();
    });
  });

  describe("connection error", () => {
    test("socket initialization", (done) => {
      expect.assertions(2);

      const connectionBase = TestConnection({ port: 0 });

      connectionBase.once("error", (connection, error) => {
        expect(connection.isError()).toBe(true);
        expect(error.message).toContain("EADDRNOTAVAIL");
        done();
      });

      connectionBase.close();
    });
  });
});
