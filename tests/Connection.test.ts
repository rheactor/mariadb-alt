import { TestConnection } from "@Tests/Fixtures/TestConnection";

describe("Connection", () => {
  describe("socket initialization", () => {
    const connectionBase = TestConnection();

    test("socket initialization", (done) => {
      expect.assertions(1);

      connectionBase.once("ready", (connection) => {
        expect(connection.isReady()).toBe(true);
        done();
      });
    });

    afterAll(() => {
      connectionBase.close();
    });
  });
});
