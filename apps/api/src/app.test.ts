//* Libraries imports
import { afterEach, describe, expect, mock, test } from "bun:test";

//* Local imports
import { createTestApp, startTestServer, waitFor } from "./test/helpers";
import { resetStore } from "./tunnel/store";
import type { WebhookEvent } from "./tunnel/types";

const originalRandomUUID = crypto.randomUUID;

let server: ReturnType<typeof startTestServer> | null = null;

afterEach(async () => {
  resetStore();
  crypto.randomUUID = originalRandomUUID;
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

describe("createApp", () => {
  test("returns health status", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("forwards webhooks end-to-end through WebSocket registration", async () => {
    crypto.randomUUID = mock(() => "e2e-event") as typeof crypto.randomUUID;

    server = startTestServer(createTestApp("http://localhost:3000"));

    const socket = new WebSocket(`${getWebSocketUrl()}/ws`);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
    });

    socket.send(JSON.stringify({ type: "register", tunnel: "e2e-tunnel" }));

    const registeredMessage = await new Promise<{ type: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for registration")), 2000);

      socket.addEventListener(
        "message",
        (event) => {
          clearTimeout(timeout);
          resolve(JSON.parse(String(event.data)));
        },
        { once: true },
      );
    });

    expect(registeredMessage.type).toBe("registered");

    const webhookPromise = new Promise<WebhookEvent>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for webhook event")), 2000);

      socket.addEventListener(
        "message",
        (event) => {
          clearTimeout(timeout);
          resolve(JSON.parse(String(event.data)));
        },
        { once: true },
      );
    });

    const response = await fetch(`${getServerUrl()}/hook/e2e-tunnel`, {
      method: "POST",
      body: '{"ping":true}',
      headers: { "Content-Type": "application/json", "x-test": "1" },
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted", id: "e2e-event" });

    const webhookEvent = await webhookPromise;
    expect(webhookEvent.type).toBe("webhook");
    expect(webhookEvent.id).toBe("e2e-event");
    expect(webhookEvent.body).toBe('{"ping":true}');
    expect(webhookEvent.headers["x-test"]).toBe("1");

    socket.close();
    await waitFor(() => socket.readyState === WebSocket.CLOSED);
  });
});
