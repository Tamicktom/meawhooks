//* Libraries imports
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { render } from "ink-testing-library";

//* Local imports
import { installMockWebSocket, MockWebSocket, restoreWebSocket } from "../test/mock-websocket";
import type { ForwardWebhookResult } from "../lib/forward-webhook";
import type { WebhookEvent } from "../lib/types";

const originalWebSocket = globalThis.WebSocket;
const forwardWebhookMock = mock(
  (): Promise<ForwardWebhookResult> => Promise.resolve({ ok: true, status: 200 }),
);

mock.module("../lib/forward-webhook", () => ({
  forwardWebhook: forwardWebhookMock,
}));

type ListenCommandComponent = typeof import("./listen").ListenCommand;

let ListenCommand: ListenCommandComponent;

beforeAll(async () => {
  ({ ListenCommand } = await import("./listen"));
});

beforeEach(() => {
  forwardWebhookMock.mockReset();
  forwardWebhookMock.mockImplementation(() => Promise.resolve({ ok: true, status: 200 }));
  installMockWebSocket();
  process.env.API_URL = "http://localhost:3000";
});

afterEach(() => {
  restoreWebSocket(originalWebSocket);
});

async function waitForFrame(getFrame: () => string, pattern: RegExp, timeoutMs = 2000) {
  const start = Date.now();

  while (!pattern.test(getFrame())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for frame matching ${pattern}\nLast frame:\n${getFrame()}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("ListenCommand", () => {
  test("shows connecting status on mount", () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    expect(view.lastFrame()).toContain("Status:");
    expect(view.lastFrame()).toContain("connecting");
  });

  test("shows connected status and webhook URL after registration", async () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage({
      type: "registered",
      tunnel: "my-app",
      webhookUrl: "http://localhost:3000/hook/my-app",
    });

    await waitForFrame(() => view.lastFrame() ?? "", /connected/);
    expect(view.lastFrame()).toContain("Webhook URL: http://localhost:3000/hook/my-app");
  });

  test("shows error message from server", async () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage({
      type: "error",
      message: "Tunnel slug already in use",
    });

    await waitForFrame(() => view.lastFrame() ?? "", /Tunnel slug already in use/);
    expect(view.lastFrame()).toContain("Status:");
    expect(view.lastFrame()).toContain("error");
  });

  test("forwards webhook events and shows success log", async () => {
    forwardWebhookMock.mockImplementation(() => Promise.resolve({ ok: true, status: 204 }));

    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();

    const event: WebhookEvent = {
      type: "webhook",
      id: "wh-1",
      method: "POST",
      path: "/events",
      query: "",
      headers: {},
      body: "{}",
      bodyEncoding: "text",
    };

    socket.simulateMessage(event);

    await waitForFrame(() => view.lastFrame() ?? "", /\[OK\] POST \/events — 204/);
    expect(view.lastFrame()).toContain("Received: 1");
    expect(view.lastFrame()).toContain("Forwarded: 1");
    expect(forwardWebhookMock).toHaveBeenCalledWith("http://localhost:8080/hook", event);
  });

  test("shows failure log when forwarding fails", async () => {
    forwardWebhookMock.mockImplementation(() => Promise.resolve({ ok: false, error: "Connection refused" }));

    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage({
      type: "webhook",
      id: "wh-2",
      method: "POST",
      path: "/",
      query: "",
      headers: {},
      body: null,
    });

    await waitForFrame(() => view.lastFrame() ?? "", /\[ERR\] POST \/ — Connection refused/);
    expect(view.lastFrame()).toContain("Failed: 1");
  });

  test("shows error for invalid server JSON", async () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();
    socket.simulateMessage("{bad-json");

    await waitForFrame(() => view.lastFrame() ?? "", /Invalid message from server/);
  });

  test("shows WebSocket connection error", async () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateError();

    await waitForFrame(() => view.lastFrame() ?? "", /WebSocket connection error/);
  });

  test("closes socket on unmount", () => {
    const view = render(<ListenCommand tunnel="my-app" targetUrl="http://localhost:8080/hook" />);

    const socket = MockWebSocket.latest();
    socket.simulateOpen();

    view.unmount();

    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });
});
