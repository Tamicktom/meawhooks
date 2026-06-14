//* Local imports
import type { WebhookEvent } from "./types";

export type ForwardWebhookResult = {
  ok: true;
  status: number;
} | {
  ok: false;
  error: string;
};

function buildTargetUrl(targetBaseUrl: string, event: WebhookEvent): string {
  const base = new URL(targetBaseUrl);
  const basePath = base.pathname.replace(/^\/+|\/+$/g, "");
  const suffixPath = event.path.replace(/^\/+/, "");
  const combinedPath = [basePath, suffixPath].filter(Boolean).join("/");
  base.pathname = combinedPath ? `/${combinedPath}` : "/";
  base.search = event.query.startsWith("?") ? event.query.slice(1) : event.query;
  return base.toString();
}

function decodeBody(event: WebhookEvent): BodyInit | null {
  if (event.body === null) {
    return null;
  }

  if (event.bodyEncoding === "base64") {
    const bytes = Buffer.from(event.body, "base64");
    return bytes;
  }

  return event.body;
}

export async function forwardWebhook(
  targetBaseUrl: string,
  event: WebhookEvent,
): Promise<ForwardWebhookResult> {
  const url = buildTargetUrl(targetBaseUrl, event);
  const body = decodeBody(event);

  try {
    const response = await fetch(url, {
      method: event.method,
      headers: event.headers,
      body: body === null ? undefined : body,
    });

    return { ok: true, status: response.status };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { ok: false, error: errorMessage };
  }
}
