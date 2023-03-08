import { Connection } from "@/Connection";

describe("Connection", () => {
  describe("socket initialization", () => {
    const connectionBase = new Connection();

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
