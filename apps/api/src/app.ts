//* Libraries imports
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";

//* Local imports
import { createTunnelWebSocket } from "./tunnel/ws";
import { createWebhookRoutes } from "./tunnel/webhook";

export function createApp(publicUrl: string) {
  return new Elysia()
    .use(
      openapi({
        documentation: {
          info: {
            title: "meawhooks API",
            version: "0.0.0",
            description:
              "Webhook capture API. CLI clients register tunnels via WebSocket at WS /ws (not covered by this OpenAPI spec).",
          },
          tags: [
            { name: "System", description: "Health and diagnostics" },
            { name: "Webhooks", description: "Public webhook ingress" },
          ],
        },
        exclude: {
          paths: ["/ws"],
        },
      }),
    )
    .get("/health", () => ({ status: "ok" }), {
      detail: {
        summary: "Health check",
        description: "Returns API liveness status.",
        tags: ["System"],
      },
    })
    .use(createTunnelWebSocket(publicUrl))
    .use(createWebhookRoutes());
}
