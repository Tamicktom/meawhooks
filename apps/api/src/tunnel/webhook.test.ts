//* Libraries imports
import { afterEach, describe, expect, mock, test } from "bun:test";

//* Local imports
import { createWebhookRoutes } from "./webhook";
import { registerTunnel, resetStore } from "./store";
import { createMockSocket } from "../test/helpers";
import type { WebhookEvent } from "./types";

const originalRandomUUID = crypto.randomUUID;

afterEach(() => {
  resetStore();
  crypto.randomUUID = originalRandomUUID;
});

function createWebhookApp() {
  return createWebhookRoutes();
}

describe("createWebhookRoutes", () => {
  test("returns 503 when no active tunnel listener", async () => {
    const app = createWebhookApp();
    const response = await app.handle(
      new Request("http://localhost/hook/my-tunnel", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "No active tunnel listener" });
  });

  test("returns 202 and forwards event to registered socket", async () => {
    crypto.randomUUID = mock(() => "event-123") as typeof crypto.randomUUID;

    const socket = createMockSocket();
    registerTunnel("my-tunnel", socket);

    const app = createWebhookApp();
    const response = await app.handle(
      new Request("http://localhost/hook/my-tunnel", {
        method: "POST",
        body: '{"hello":"world"}',
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "accepted", id: "event-123" });

    expect(socket.sent).toHaveLength(1);
    const event = JSON.parse(socket.sent[0]!) as WebhookEvent;
    expect(event.type).toBe("webhook");
    expect(event.id).toBe("event-123");
    expect(event.method).toBe("POST");
    expect(event.path).toBe("");
    expect(event.body).toBe('{"hello":"world"}');
    expect(event.bodyEncoding).toBe("text");
  });

  test("returns null body for GET requests", async () => {
    crypto.randomUUID = mock(() => "event-get") as typeof crypto.randomUUID;

    const socket = createMockSocket();
    registerTunnel("my-tunnel", socket);

    const app = createWebhookApp();
    const response = await app.handle(new Request("http://localhost/hook/my-tunnel", { method: "GET" }));

    expect(response.status).toBe(202);

    const event = JSON.parse(socket.sent[0]!) as WebhookEvent;
    expect(event.body).toBeNull();
    expect(event.bodyEncoding).toBeUndefined();
  });

  test("encodes binary bodies as base64", async () => {
    crypto.randomUUID = mock(() => "event-binary") as typeof crypto.randomUUID;

    const socket = createMockSocket();
    registerTunnel("my-tunnel", socket);

    const binaryBody = new Uint8Array([0, 1, 2, 255]);
    const app = createWebhookApp();
    const response = await app.handle(
      new Request("http://localhost/hook/my-tunnel", {
        method: "POST",
        body: binaryBody,
      }),
    );

    expect(response.status).toBe(202);

    const event = JSON.parse(socket.sent[0]!) as WebhookEvent;
    expect(event.bodyEncoding).toBe("base64");
    expect(event.body).toBe(Buffer.from(binaryBody).toString("base64"));
  });

  test("preserves path suffix and query string", async () => {
    crypto.randomUUID = mock(() => "event-path") as typeof crypto.randomUUID;

    const socket = createMockSocket();
    registerTunnel("my-tunnel", socket);

    const app = createWebhookApp();
    const response = await app.handle(
      new Request("http://localhost/hook/my-tunnel/extra/path?q=1", { method: "POST", body: "ok" }),
    );

    expect(response.status).toBe(202);

    const event = JSON.parse(socket.sent[0]!) as WebhookEvent;
    expect(event.path).toBe("/extra/path");
    expect(event.query).toBe("?q=1");
  });

  test("filters hop-by-hop headers from the event", async () => {
    crypto.randomUUID = mock(() => "event-headers") as typeof crypto.randomUUID;

    const socket = createMockSocket();
    registerTunnel("my-tunnel", socket);

    const app = createWebhookApp();
    const response = await app.handle(
      new Request("http://localhost/hook/my-tunnel", {
        method: "POST",
        body: "ok",
        headers: {
          host: "example.com",
          connection: "keep-alive",
          "x-custom": "value",
        },
      }),
    );

    expect(response.status).toBe(202);

    const event = JSON.parse(socket.sent[0]!) as WebhookEvent;
    expect(event.headers).toEqual({ "x-custom": "value" });
    expect(event.headers.host).toBeUndefined();
    expect(event.headers.connection).toBeUndefined();
  });
});
