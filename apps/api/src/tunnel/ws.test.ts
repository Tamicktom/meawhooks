//* Libraries imports
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

//* Local imports
import { createTestApp, startTestServer, waitFor } from "../test/helpers";
import { getTunnelSockets, resetStore } from "./store";

const REGISTER_TIMEOUT_MS = 5000;

let server: ReturnType<typeof startTestServer> | null = null;

afterEach(async () => {
  resetStore();
  server?.stop(true);
  server = null;
});

function getServerUrl() {
  if (!server?.server) {
    throw new Error("Test server is not running");
  }

  const hostname = server.server.hostname;
  const port = server.server.port;
  return `http://${hostname}:${port}`;
}

function getWebSocketUrl() {
  return getServerUrl().replace("http://", "ws://");
}

async function openWebSocket(): Promise<WebSocket> {
  const socket = new WebSocket(`${getWebSocketUrl()}/ws`);

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
  });

  return socket;
}

async function readNextMessage(socket: WebSocket, timeoutMs = 2000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for WebSocket message"));
    }, timeoutMs);

    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        resolve(JSON.parse(String(event.data)));
      },
      { once: true },
    );
  });
}

describe("createTunnelWebSocket", () => {
  beforeEach(() => {
    server = startTestServer(createTestApp("http://localhost:3000"));
  });

  test("registers a valid tunnel and returns webhook URL", async () => {
    const socket = await openWebSocket();
    socket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));

    const message = await readNextMessage(socket);

    expect(message).toEqual({
      type: "registered",
      tunnel: "my-app",
      webhookUrl: "http://localhost:3000/hook/my-app",
    });

    socket.close();
  });

  test("rejects an invalid tunnel slug", async () => {
    const socket = await openWebSocket();
    socket.send(JSON.stringify({ type: "register", tunnel: "ab" }));

    const message = await readNextMessage(socket);

    expect(message).toEqual({
      type: "error",
      message: "Invalid tunnel slug. Use 3-32 lowercase letters, numbers, or hyphens.",
    });

    await new Promise<void>((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
    });
  });

  test("rejects invalid register messages", async () => {
    const socket = await openWebSocket();
    socket.send(JSON.stringify({ type: "unknown" }));

    const message = await readNextMessage(socket);

    expect(message).toEqual({
      type: "error",
      message: "Expected register message",
    });

    await new Promise<void>((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
    });
  });

  test("rejects malformed JSON", async () => {
    const socket = await openWebSocket();
    socket.send("{not-json");

    const message = await readNextMessage(socket);

    expect(message).toEqual({
      type: "error",
      message: "Expected register message",
    });
  });

  test("rejects a second register on the same connection", async () => {
    const socket = await openWebSocket();
    socket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    await readNextMessage(socket);

    socket.send(JSON.stringify({ type: "register", tunnel: "other-app" }));
    const message = await readNextMessage(socket);

    expect(message).toEqual({
      type: "error",
      message: "Already registered",
    });

    socket.close();
  });

  test("allows a second socket on the same tunnel", async () => {
    const firstSocket = await openWebSocket();
    firstSocket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    await readNextMessage(firstSocket);

    const secondSocket = await openWebSocket();
    secondSocket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    const message = await readNextMessage(secondSocket);

    expect(message).toEqual({
      type: "registered",
      tunnel: "my-app",
      webhookUrl: "http://localhost:3000/hook/my-app",
    });

    expect(getTunnelSockets("my-app")).toHaveLength(2);

    firstSocket.close();
    secondSocket.close();
  });

  test("closes with registration timeout when register is never sent", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const timeoutCallbacks: Array<() => void> = [];

    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
      if (delay === REGISTER_TIMEOUT_MS) {
        timeoutCallbacks.push(callback);
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }

      return originalSetTimeout(callback, delay);
    }) as typeof setTimeout;

    try {
      const socket = await openWebSocket();

      if (timeoutCallbacks.length === 0) {
        throw new Error("Registration timeout was not scheduled");
      }

      timeoutCallbacks[0]!();

      const message = await readNextMessage(socket);

      expect(message).toEqual({
        type: "error",
        message: "Registration timeout",
      });

      await new Promise<void>((resolve) => {
        socket.addEventListener("close", () => resolve(), { once: true });
      });
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("does not close with registration timeout after successful registration", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const timeoutCallbacks: Array<() => void> = [];

    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
      if (delay === REGISTER_TIMEOUT_MS) {
        timeoutCallbacks.push(callback);
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }

      return originalSetTimeout(callback, delay);
    }) as typeof setTimeout;

    try {
      const socket = await openWebSocket();
      socket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));

      const message = await readNextMessage(socket);

      expect(message).toEqual({
        type: "registered",
        tunnel: "my-app",
        webhookUrl: "http://localhost:3000/hook/my-app",
      });

      if (timeoutCallbacks.length === 0) {
        throw new Error("Registration timeout was not scheduled");
      }

      timeoutCallbacks[0]!();

      expect(socket.readyState).toBe(WebSocket.OPEN);

      socket.close();
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("unregisters tunnel when the last socket closes", async () => {
    const socket = await openWebSocket();
    socket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    await readNextMessage(socket);

    expect(getTunnelSockets("my-app")).toHaveLength(1);

    socket.close();
    await waitFor(() => getTunnelSockets("my-app").length === 0);

    const response = await fetch(`${getServerUrl()}/hook/my-app`, { method: "POST", body: "test" });
    expect(response.status).toBe(503);
  });

  test("keeps tunnel active when one of multiple sockets closes", async () => {
    const firstSocket = await openWebSocket();
    firstSocket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    await readNextMessage(firstSocket);

    const secondSocket = await openWebSocket();
    secondSocket.send(JSON.stringify({ type: "register", tunnel: "my-app" }));
    await readNextMessage(secondSocket);

    expect(getTunnelSockets("my-app")).toHaveLength(2);

    firstSocket.close();
    await waitFor(() => getTunnelSockets("my-app").length === 1);

    const response = await fetch(`${getServerUrl()}/hook/my-app`, { method: "POST", body: "test" });
    expect(response.status).toBe(202);

    secondSocket.close();
  });
});
