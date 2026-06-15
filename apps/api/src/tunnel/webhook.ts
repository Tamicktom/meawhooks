//* Libraries imports
import { Elysia } from "elysia";

//* Local imports
import { getTunnelSocket } from "./store";
import type { WebhookEvent } from "./types";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function filterHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  });

  return result;
}

async function serializeBody(request: Request): Promise<Pick<WebhookEvent, "body" | "bodyEncoding">> {
  if (request.method === "GET" || request.method === "HEAD") {
    return { body: null };
  }

  const buffer = await request.arrayBuffer();

  if (buffer.byteLength === 0) {
    return { body: null };
  }

  const bytes = new Uint8Array(buffer);
  const isText = bytes.every((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126));

  if (isText) {
    return { body: new TextDecoder().decode(bytes), bodyEncoding: "text" };
  }

  return { body: Buffer.from(bytes).toString("base64"), bodyEncoding: "base64" };
}

type WebhookParams = {
  tunnel: string;
  "*"?: string;
};

function buildWebhookEvent(
  request: Request,
  params: WebhookParams,
): Promise<WebhookEvent> {
  const url = new URL(request.url);
  const suffix = params["*"] ? `/${params["*"]}` : "";
  const query = url.search;

  return serializeBody(request).then((bodyFields) => ({
    type: "webhook",
    id: crypto.randomUUID(),
    method: request.method,
    path: suffix,
    query,
    headers: filterHeaders(request.headers),
    ...bodyFields,
  }));
}

function forwardWebhook(event: WebhookEvent, tunnel: string) {
  const socket = getTunnelSocket(tunnel);

  if (!socket) {
    return null;
  }

  socket.send(JSON.stringify(event));
  return event.id;
}

async function handleWebhook(request: Request, params: WebhookParams) {
  const event = await buildWebhookEvent(request, params);
  const id = forwardWebhook(event, params.tunnel);

  if (!id) {
    return new Response(JSON.stringify({ error: "No active tunnel listener" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "accepted", id }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

export function createWebhookRoutes() {
  return new Elysia({ name: "tunnel-webhook" })
    .all("/hook/:tunnel", ({ request, params }) => handleWebhook(request, params))
    .all("/hook/:tunnel/*", ({ request, params }) => handleWebhook(request, params));
}
