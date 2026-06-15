//* Libraries imports
import { describe, expect, test } from "bun:test";

//* Local imports
import { parseListenArgs } from "./parse-listen-args";

describe("parseListenArgs", () => {
  test("parses tunnel flag and target URL", () => {
    expect(parseListenArgs(["--tunnel", "my-app", "http://localhost:8080/hook"])).toEqual({
      tunnel: "my-app",
      targetUrl: "http://localhost:8080/hook",
    });
  });

  test("returns empty values when tunnel is missing", () => {
    expect(parseListenArgs(["http://localhost:8080/hook"])).toEqual({
      tunnel: "",
      targetUrl: "http://localhost:8080/hook",
    });
  });

  test("returns empty values when target URL is missing", () => {
    expect(parseListenArgs(["--tunnel", "my-app"])).toEqual({
      tunnel: "my-app",
      targetUrl: "",
    });
  });

  test("ignores extra positional arguments", () => {
    expect(parseListenArgs(["--tunnel", "my-app", "http://localhost:8080/hook", "extra"])).toEqual({
      tunnel: "my-app",
      targetUrl: "http://localhost:8080/hook",
    });
  });

  test("accepts flag before positional URL", () => {
    expect(parseListenArgs(["--tunnel", "slug", "http://localhost:3000/a"])).toEqual({
      tunnel: "slug",
      targetUrl: "http://localhost:3000/a",
    });
  });
});
