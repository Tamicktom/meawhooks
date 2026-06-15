export type RegisterMessage = {
  type: "register";
  tunnel: string;
};

export type RegisteredMessage = {
  type: "registered";
  tunnel: string;
  webhookUrl: string;
};

export type ErrorMessage = {
  type: "error";
  message: string;
};

export type WebhookEvent = {
  type: "webhook";
  id: string;
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string | null;
  bodyEncoding?: "text" | "base64";
};

export type ServerMessage = RegisteredMessage | ErrorMessage | WebhookEvent;

export function toWebSocketUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}
