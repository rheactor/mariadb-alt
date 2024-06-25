import { expect, test } from "vitest";

import { PacketOk } from "@/Protocol/Packet/PacketOk.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";

// eslint-disable-next-line vitest/prefer-expect-assertions
test("authenticate", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = testConnection();

    connection.on("closed", () => {
      resolve();
    });

    connection.once("connected", (connectionInner) => {
      expect(connectionInner.isConnected()).toBeTruthy();
    });

    connection.once("authenticating", (connectionInner) => {
      expect(connectionInner.isAuthenticating()).toBeTruthy();
    });

    connection.once("authenticated", (connectionInner) => {
      expect(connectionInner.hasAuthenticated()).toBeTruthy();

      void connectionInner.close();
    });
  }));

test("ping() command", async () => {
  expect.assertions(2);

  const connection = testConnection();

  const ping1 = expect(connection.ping()).resolves.toBeInstanceOf(PacketOk);

  const ping2 = expect(connection.ping()).resolves.toBeInstanceOf(PacketOk);

  await Promise.all([ping1, ping2]);

  void connection.close();
});

// eslint-disable-next-line vitest/prefer-expect-assertions
test("close() command before authentication", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(2);

    const connection = testConnection();

    connection.once("closed", () => {
      expect(true).toBeTruthy();
      resolve();
    });

    connection
      .close()
      .then(() => {
        expect(true).toBeTruthy();

        return null;
      })
      // no connected
      .catch(() => {
        /** empty */
      });
  }));

// eslint-disable-next-line vitest/prefer-expect-assertions
test("close() command after authentication", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = testConnection();

    connection.once("closed", () => {
      expect(true).toBeTruthy();
      resolve();
    });

    connection.once("authenticated", () => {
      expect(true).toBeTruthy();

      connection
        .close()
        .then(() => {
          expect(true).toBeTruthy();

          return null;
        })
        //  connected
        .catch(() => {
          /** empty */
        });
    });
  }));
