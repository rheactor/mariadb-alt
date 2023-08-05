import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { ConnectionException } from "@/Exceptions/ConnectionException";

test("invalid port", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(2);

    const connectionBase = TestConnection({ port: 1 });

    connectionBase.once("closed", () => {
      resolve();
    });

    connectionBase.once("error", (connection, error) => {
      expect(connection.hasError()).toBeTruthy();
      expect(error.code).toContain("ECONNREFUSED");
    });
  }));

test("invalid user", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connectionBase = TestConnection({
      user: `random-user-0.5318529997882291`,
    });

    connectionBase.once("closed", () => {
      resolve();
    });

    connectionBase.once("error", (connection, error) => {
      expect.assertions(3);

      expect(connection.hasError()).toBeTruthy();
      expect(error.message).toContain("random-user");

      if (error instanceof ConnectionException) {
        expect(error.code).toBe(1045);
      }
    });
  }));

test("wrong password", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connectionBase = TestConnection({
      password: Math.random().toString(),
    });

    connectionBase.once("closed", () => {
      resolve();
    });

    connectionBase.once("error", (connection, error) => {
      expect(connection.hasError()).toBeTruthy();
      expect(error.message).toContain("denied for user");

      if (error instanceof ConnectionException) {
        expect(error.code).toBe(1045);
      }
    });
  }));
