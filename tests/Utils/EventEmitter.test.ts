import { EventEmitter } from "@/Utils/EventEmitter";
import { getTestName } from "@Tests/Fixtures/Utils";

describe(getTestName(__filename), () => {
  test("on(), emit()", () => {
    expect.assertions(1);

    const events = new EventEmitter();

    events.on("test", () => {
      expect(true).toBe(true);
    });

    events.emit("test");
  });

  test("on(), emit() with arguments", () => {
    expect.assertions(1);

    const events = new EventEmitter();

    events.on("test", (a, b, c) => {
      expect(a + b + c).toBe(6);
    });

    events.emit("test", 1, 2, 3);
  });

  test("on(), off(), emit()", () => {
    expect.assertions(0);

    const events = new EventEmitter();

    events.on("test", () => {
      expect(true).toBe(false);
    });

    events.off("test");
    events.emit("test");
  });

  test("on() multiple declarations", () => {
    expect.assertions(2);

    const events = new EventEmitter();

    let count = 0;

    events.on("test", () => {
      expect(++count).toBe(1);
    });

    events.on("test", () => {
      expect(++count).toBe(2);
    });

    events.emit("test");
  });

  test("once()", () => {
    expect.assertions(1);

    const events = new EventEmitter();

    let count = 0;

    events.once("test", () => {
      count++;
    });

    events.once("test", () => {
      count++;
    });

    events.emit("test");
    events.emit("test");

    expect(count).toBe(2);
  });

  test("emit() multiple declarations", () => {
    const events = new EventEmitter();

    let count = 0;

    events.on("test", () => {
      count++;
    });

    events.emit("test");
    events.emit("test");

    expect(count).toBe(2);
  });

  test("emit(inexistent)", () => {
    expect.assertions(0);

    new EventEmitter().emit("test");
  });

  test("off() with callback", () => {
    let count = 0;

    const events = new EventEmitter();
    const increase = () => count++;

    events.on("test", () => {
      count++;
    });
    events.on("test", increase);

    events.emit("test");

    expect(count).toBe(2);

    events.off("test", increase);
    events.emit("test");

    expect(count).toBe(3);

    events.off("test");
    events.emit("test");

    expect(count).toBe(3);
  });
});
