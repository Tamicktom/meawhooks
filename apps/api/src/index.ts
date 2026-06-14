//* Local imports
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${port}`;

const app = createApp(publicUrl).listen(port);

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);
