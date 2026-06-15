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

export type ClientMessage = RegisterMessage;

export type ServerMessage = RegisteredMessage | ErrorMessage | WebhookEvent;

export const TUNNEL_SLUG_PATTERN = /^[a-z0-9-]{3,32}$/;
