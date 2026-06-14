//* Libraries imports
import { Elysia } from "elysia";

const port = Number(process.env.PORT ?? 3000);

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .get("/hello-world", () => ({ message: "Hello, World!" }))
  .listen(port);

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);
