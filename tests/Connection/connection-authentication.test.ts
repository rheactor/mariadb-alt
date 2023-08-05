import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { PacketOk } from "@/Protocol/Packet/PacketOk";

test("authenticate", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connectionBase = TestConnection();

    connectionBase.on("closed", () => {
      resolve();
    });

    connectionBase.once("connected", (connection) => {
      expect(connection.isConnected()).toBeTruthy();
    });

    connectionBase.once("authenticating", (connection) => {
      expect(connection.isAuthenticating()).toBeTruthy();
    });

    connectionBase.once("authenticated", (connection) => {
      expect(connection.hasAuthenticated()).toBeTruthy();
      void connection.close();
    });
  }));

test("ping() command", async () => {
  expect.assertions(2);

  const connectionBase = TestConnection();

  const ping1 = expect(connectionBase.ping()).resolves.toBeInstanceOf(PacketOk);

  const ping2 = expect(connectionBase.ping()).resolves.toBeInstanceOf(PacketOk);

  await Promise.all([ping1, ping2]);
});

test("close() command before authentication", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(2);

    const connectionBase = TestConnection();

    connectionBase.once("closed", () => {
      expect(true).toBeTruthy();
      resolve();
    });

    connectionBase
      .close()
      .then(() => {
        expect(true).toBeTruthy();

        return null;
      }) // no connected
      .catch(() => {
        /** empty */
      });
  }));

test("close() command after authentication", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connectionBase = TestConnection();

    connectionBase.once("closed", () => {
      expect(true).toBeTruthy();
      resolve();
    });

    connectionBase.once("authenticated", () => {
      expect(true).toBeTruthy();

      connectionBase
        .close()
        .then(() => {
          expect(true).toBeTruthy();

          return null;
        }) //  connected
        .catch(() => {
          /** empty */
        });
    });
  }));
