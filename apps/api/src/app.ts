//* Libraries imports
import { Elysia } from "elysia";

//* Local imports
import { createTunnelWebSocket } from "./tunnel/ws";
import { createWebhookRoutes } from "./tunnel/webhook";

export function createApp(publicUrl: string) {
  return new Elysia()
    .get("/health", () => ({ status: "ok" }))
    .use(createTunnelWebSocket(publicUrl))
    .use(createWebhookRoutes());
}
