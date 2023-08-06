import { TestConnection } from "@Tests/Fixtures/test-connection";
import { expect, test } from "vitest";

import { ConnectionException } from "@/Exceptions/ConnectionException";

test("invalid port", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(2);

    const connection = TestConnection({ port: 1 });

    connection.once("closed", () => {
      resolve();
    });

    connection.once("error", (connectionInner, error) => {
      expect(connectionInner.hasError()).toBeTruthy();
      expect(error.code).toContain("ECONNREFUSED");
    });
  }));

test("invalid user", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = TestConnection({
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

test("wrong password", async () =>
  new Promise<void>((resolve) => {
    expect.assertions(3);

    const connection = TestConnection({
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
