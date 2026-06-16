//* Libraries imports
import { afterEach, describe, expect, test } from "bun:test";

//* Local imports
import {
  getTunnelSockets,
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
    expect(getTunnelSockets("my-tunnel")).toEqual([socket]);
  });

  test("allows re-registering the same socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    const result = registerTunnel("my-tunnel", socket);

    expect(result).toEqual({ ok: true });
    expect(getTunnelSockets("my-tunnel")).toEqual([socket]);
  });

  test("allows multiple sockets on the same tunnel", () => {
    const firstSocket = { send: () => {} };
    const secondSocket = { send: () => {} };

    registerTunnel("my-tunnel", firstSocket);
    const result = registerTunnel("my-tunnel", secondSocket);

    expect(result).toEqual({ ok: true });
    expect(getTunnelSockets("my-tunnel")).toEqual([firstSocket, secondSocket]);
  });

  test("rejects a different tunnel when the socket is already registered", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    const result = registerTunnel("other-tunnel", socket);

    expect(result).toEqual({ ok: false, reason: "already_registered" });
    expect(getTunnelSockets("my-tunnel")).toEqual([socket]);
    expect(getTunnelSockets("other-tunnel")).toEqual([]);
  });
});

describe("unregisterSocket", () => {
  test("removes the tunnel mapping for a registered socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    unregisterSocket(socket);

    expect(getTunnelSockets("my-tunnel")).toEqual([]);
  });

  test("is a no-op for an unknown socket", () => {
    const socket = { send: () => {} };

    registerTunnel("my-tunnel", socket);
    unregisterSocket({ send: () => {} });

    expect(getTunnelSockets("my-tunnel")).toEqual([socket]);
  });

  test("removes only the disconnected socket when others remain", () => {
    const firstSocket = { send: () => {} };
    const secondSocket = { send: () => {} };

    registerTunnel("my-tunnel", firstSocket);
    registerTunnel("my-tunnel", secondSocket);
    unregisterSocket(firstSocket);

    expect(getTunnelSockets("my-tunnel")).toEqual([secondSocket]);
  });
});
