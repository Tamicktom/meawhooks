//* Libraries imports
import { afterEach, describe, expect, test } from "bun:test";

//* Local imports
import {
  getTunnelSocket,
  registerTunnel,
  resetStore,
  unregisterSocket,
} from "./store";

afterEach(() => {
  resetStore();
});

describe("registerTunnel", () => {
  test("registers a new tunnel and makes it retrievable", () => {
    const socket = { send: () => {} };

    const result = registerTunnel("my-tunnel", socket);

    expect(result).toEqual({ ok: true });
    expect(getTunnelSocket("my-tunnel")).toBe(socket);
  });

  test("allows re-registering the same socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    const result = registerTunnel("my-tunnel", socket);

    expect(result).toEqual({ ok: true });
    expect(getTunnelSocket("my-tunnel")).toBe(socket);
  });

  test("rejects a different socket when tunnel is taken", () => {
    const firstSocket = { send: () => {} };
    const secondSocket = { send: () => {} };

    registerTunnel("my-tunnel", firstSocket);
    const result = registerTunnel("my-tunnel", secondSocket);

    expect(result).toEqual({ ok: false, reason: "taken" });
    expect(getTunnelSocket("my-tunnel")).toBe(firstSocket);
  });

  test("rejects a different tunnel when the socket is already registered", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    const result = registerTunnel("other-tunnel", socket);

    expect(result).toEqual({ ok: false, reason: "already_registered" });
    expect(getTunnelSocket("my-tunnel")).toBe(socket);
    expect(getTunnelSocket("other-tunnel")).toBeUndefined();
  });
});

describe("unregisterSocket", () => {
  test("removes the tunnel mapping for a registered socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    unregisterSocket(socket);

    expect(getTunnelSocket("my-tunnel")).toBeUndefined();
  });

  test("is a no-op for an unknown socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    unregisterSocket({ send: () => {} });

    expect(getTunnelSocket("my-tunnel")).toBe(socket);
  });

  test("does not remove the tunnel if another socket replaced it", () => {
    const firstSocket = { send: () => {} };
    const secondSocket = { send: () => {} };

    registerTunnel("my-tunnel", firstSocket);
    unregisterSocket(firstSocket);
    registerTunnel("my-tunnel", secondSocket);
    unregisterSocket(firstSocket);

    expect(getTunnelSocket("my-tunnel")).toBe(secondSocket);
  });
});
