//* Libraries imports
import { describe, expect, test } from "bun:test";

//* Local imports
import { TUNNEL_SLUG_PATTERN } from "./types";

describe("TUNNEL_SLUG_PATTERN", () => {
  test("accepts valid slugs", () => {
    expect(TUNNEL_SLUG_PATTERN.test("abc")).toBe(true);
    expect(TUNNEL_SLUG_PATTERN.test("my-app")).toBe(true);
    expect(TUNNEL_SLUG_PATTERN.test("my-app-123")).toBe(true);
    expect(TUNNEL_SLUG_PATTERN.test("a".repeat(32))).toBe(true);
  });

  test("rejects invalid slugs", () => {
    expect(TUNNEL_SLUG_PATTERN.test("ab")).toBe(false);
    expect(TUNNEL_SLUG_PATTERN.test("a".repeat(33))).toBe(false);
    expect(TUNNEL_SLUG_PATTERN.test("My-App")).toBe(false);
    expect(TUNNEL_SLUG_PATTERN.test("my_app")).toBe(false);
    expect(TUNNEL_SLUG_PATTERN.test("")).toBe(false);
  });
});
