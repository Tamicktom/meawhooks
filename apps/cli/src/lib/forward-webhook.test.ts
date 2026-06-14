//* Libraries imports
import { afterEach, describe, expect, mock, test } from "bun:test";

//* Local imports
import { forwardWebhook } from "./forward-webhook";
import type { WebhookEvent } from "./types";

const baseEvent: WebhookEvent = {
  type: "webhook",
  id: "event-1",
  method: "POST",
  path: "",
  query: "",
  headers: { "content-type": "application/json" },
  body: null,
};

let fetchMock: ReturnType<typeof mock>;

afterEach(() => {
  fetchMock?.mockRestore?.();
});

function mockFetch(response: Response) {
  fetchMock = mock(() => Promise.resolve(response));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

describe("forwardWebhook", () => {
  test("merges base URL path with event path", async () => {
    mockFetch(new Response(null, { status: 204 }));

    await forwardWebhook("http://localhost:8080/webhooks/", {
      ...baseEvent,
      path: "/stripe",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8080/webhooks/stripe");
    expect(init.method).toBe("POST");
  });

  test("appends query string from event", async () => {
    mockFetch(new Response(null, { status: 200 }));

    await forwardWebhook("http://localhost:8080/hook", {
      ...baseEvent,
      query: "?sig=abc",
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8080/hook?sig=abc");
  });

  test("forwards text body", async () => {
    mockFetch(new Response(null, { status: 200 }));

    await forwardWebhook("http://localhost:8080/hook", {
      ...baseEvent,
      body: '{"ok":true}',
      bodyEncoding: "text",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('{"ok":true}');
  });

  test("decodes base64 body", async () => {
    mockFetch(new Response(null, { status: 200 }));

    const bytes = Buffer.from([0, 1, 2]);
    await forwardWebhook("http://localhost:8080/hook", {
      ...baseEvent,
      body: bytes.toString("base64"),
      bodyEncoding: "base64",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(Buffer.from(init.body as ArrayBuffer).equals(bytes)).toBe(true);
  });

  test("returns success result with status code", async () => {
    mockFetch(new Response(null, { status: 201 }));

    const result = await forwardWebhook("http://localhost:8080/hook", baseEvent);

    expect(result).toEqual({ ok: true, status: 201 });
  });

  test("returns error result when fetch throws", async () => {
    fetchMock = mock(() => Promise.reject(new Error("Network down")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await forwardWebhook("http://localhost:8080/hook", baseEvent);

    expect(result).toEqual({ ok: false, error: "Network down" });
  });

  test("returns unknown error for non-Error throws", async () => {
    fetchMock = mock(() => Promise.reject("broken"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await forwardWebhook("http://localhost:8080/hook", baseEvent);

    expect(result).toEqual({ ok: false, error: "Unknown error occurred" });
  });
});
