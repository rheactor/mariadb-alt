import { expect, test } from "vitest";

import { ConnectionException } from "@/Exceptions/ConnectionException.js";
import { testConnection } from "@Tests/Fixtures/test-connection.js";

// eslint-disable-next-line vitest/prefer-expect-assertions
test("invalid port", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(2);

    const connection = testConnection({ port: 1 });

    connection.once("closed", () => {
      resolve();
    });

    connection.once("error", (connectionInner, error) => {
      expect(connectionInner.hasError()).toBeTruthy();
      expect(error.code).toContain("ECONNREFUSED");
    });
  }));

// eslint-disable-next-line vitest/prefer-expect-assertions
test("invalid user", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = testConnection({
      user: `random-user-0.5318529997882291`,
    });

    connection.once("closed", () => {
      resolve();
    });

    connection.once("error", (connectionInner, error) => {
      expect.assertions(3);

      expect(connectionInner.hasError()).toBeTruthy();
      expect(error.message).toContain("random-user");

      if (error instanceof ConnectionException) {
        expect(error.code).toBe(1045);
      }
    });
  }));

// eslint-disable-next-line vitest/prefer-expect-assertions
test("wrong password", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = testConnection({
      password: Math.random().toString(),
    });

    connection.once("closed", () => {
      resolve();
    });

    connection.once("error", (connectionInner, error) => {
      expect(connectionInner.hasError()).toBeTruthy();
      expect(error.message).toContain("denied for user");

      if (error instanceof ConnectionException) {
        expect(error.code).toBe(1045);
      }
    });
  }));
