//* Libraries imports
import { Elysia } from "elysia";

//* Local imports
import { createApp } from "../app";

type TestApp = ReturnType<typeof createApp>;

export function createTestApp(publicUrl = "http://localhost:3000") {
  return createApp(publicUrl);
}

export function startTestServer(app: TestApp) {
  return app.listen(0);
}

export function createMockSocket() {
  const sent: string[] = [];

  const socket = {
    send: (data: string | ArrayBuffer | Uint8Array) => {
      if (typeof data === "string") {
        sent.push(data);
        return;
      }

      sent.push(new TextDecoder().decode(data));
    },
    sent,
  };

  return socket;
}

export async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
