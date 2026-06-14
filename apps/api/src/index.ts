//* Libraries imports
import { Elysia } from "elysia";

//* Local imports
import { createTunnelWebSocket } from "./tunnel/ws";
import { createWebhookRoutes } from "./tunnel/webhook";

const port = Number(process.env.PORT ?? 3000);
const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${port}`;

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(createTunnelWebSocket(publicUrl))
  .use(createWebhookRoutes())
  .listen(port);

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);
