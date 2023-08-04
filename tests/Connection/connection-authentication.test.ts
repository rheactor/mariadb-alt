import { TestConnection } from "@Tests/Fixtures/test-connection";

import { PacketOk } from "@/Protocol/Packet/PacketOk";

test("authenticate", (done) => {
  expect.assertions(3);

  const connectionBase = TestConnection();

  connectionBase.on("closed", () => {
    done();
  });

  connectionBase.once("connected", (connection) => {
    expect(connection.isConnected()).toBe(true);
  });

  connectionBase.once("authenticating", (connection) => {
    expect(connection.isAuthenticating()).toBe(true);
  });

  connectionBase.once("authenticated", (connection) => {
    expect(connection.hasAuthenticated()).toBe(true);
    void connection.close();
  });
});

test("ping() command", async () => {
  expect.assertions(2);

  const connectionBase = TestConnection();

  const ping1 = expect(connectionBase.ping()).resolves.toBeInstanceOf(PacketOk);

  const ping2 = expect(connectionBase.ping()).resolves.toBeInstanceOf(PacketOk);

  await Promise.all([ping1, ping2]);
});

test("close() command before authentication", (done) => {
  expect.assertions(2);

  const connectionBase = TestConnection();

  connectionBase.once("closed", () => {
    expect(true).toBe(true);
    done();
  });

  connectionBase
    .close()
    .then(() => {
      expect(true).toBe(true);

      return null;
    }) // no connected
    .catch(() => {
      /** empty */
    });
});

test("close() command after authentication", (done) => {
  expect.assertions(3);

  const connectionBase = TestConnection();

  connectionBase.once("closed", () => {
    expect(true).toBe(true);
    done();
  });

  connectionBase.once("authenticated", () => {
    expect(true).toBe(true);

    connectionBase
      .close()
      .then(() => {
        expect(true).toBe(true);

        return null;
      }) //  connected
      .catch(() => {
        /** empty */
      });
  });
});
