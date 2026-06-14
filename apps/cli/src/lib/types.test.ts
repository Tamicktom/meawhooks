//* Libraries imports
import { describe, expect, test } from "bun:test";

//* Local imports
import { toWebSocketUrl } from "./types";

describe("toWebSocketUrl", () => {
  test("converts http to ws", () => {
    expect(toWebSocketUrl("http://localhost:3000")).toBe("ws://localhost:3000");
  });

  test("converts https to wss", () => {
    expect(toWebSocketUrl("https://api.example.com")).toBe("wss://api.example.com");
  });

  test("removes trailing slash", () => {
    expect(toWebSocketUrl("http://localhost:3000/")).toBe("ws://localhost:3000");
  });
});
