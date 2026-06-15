//* Libraries imports
import { Elysia } from "elysia";

//* Local imports
import { registerTunnel, unregisterSocket } from "./store";
import {
  TUNNEL_SLUG_PATTERN,
  type ClientMessage,
  type ErrorMessage,
  type RegisteredMessage,
} from "./types";

const REGISTER_TIMEOUT_MS = 5000;

type PendingRegistration = {
  timeout: ReturnType<typeof setTimeout>;
  registered: boolean;
};

type RegistrationSocket = {
  send: (data: string | ArrayBuffer | Uint8Array) => void;
};

const pendingRegistrations = new WeakMap<RegistrationSocket, PendingRegistration>();

function sendMessage(ws: { send: (data: string) => void }, message: RegisteredMessage | ErrorMessage) {
  ws.send(JSON.stringify(message));
}

function clearRegistrationTimeout(socket: RegistrationSocket) {
  const pending = pendingRegistrations.get(socket);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timeout);
}

function removePendingRegistration(socket: RegistrationSocket) {
  const pending = pendingRegistrations.get(socket);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timeout);
  pendingRegistrations.delete(socket);
}

function parseMessage(rawMessage: unknown): ClientMessage | null {
  if (rawMessage instanceof Uint8Array || Buffer.isBuffer(rawMessage)) {
    const text = Buffer.isBuffer(rawMessage)
      ? rawMessage.toString("utf8")
      : new TextDecoder().decode(rawMessage);

    try {
      const parsed = JSON.parse(text);

      if (parsed?.type !== "register" || typeof parsed.tunnel !== "string") {
        return null;
      }

      return parsed as ClientMessage;
    } catch {
      return null;
    }
  }

  if (typeof rawMessage === "object" && rawMessage !== null) {
    const candidate = rawMessage as Partial<ClientMessage>;

    if (candidate.type === "register" && typeof candidate.tunnel === "string") {
      return candidate as ClientMessage;
    }

    return null;
  }

  if (typeof rawMessage !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMessage);

    if (parsed?.type !== "register" || typeof parsed.tunnel !== "string") {
      return null;
    }

    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

export function createTunnelWebSocket(publicUrl: string) {
  return new Elysia({ name: "tunnel-ws" }).ws("/ws", {
    open(ws) {
      const socket = ws.raw;

      const timeout = setTimeout(() => {
        const pending = pendingRegistrations.get(socket);

        if (pending && !pending.registered) {
          sendMessage(ws, { type: "error", message: "Registration timeout" });
          ws.close();
          removePendingRegistration(socket);
        }
      }, REGISTER_TIMEOUT_MS);

      pendingRegistrations.set(socket, { timeout, registered: false });
    },

    message(ws, rawMessage) {
      const message = parseMessage(rawMessage);

      if (!message) {
        sendMessage(ws, { type: "error", message: "Expected register message" });
        ws.close();
        return;
      }

      const pending = pendingRegistrations.get(ws.raw);

      if (pending?.registered) {
        sendMessage(ws, { type: "error", message: "Already registered" });
        return;
      }

      if (!TUNNEL_SLUG_PATTERN.test(message.tunnel)) {
        sendMessage(ws, {
          type: "error",
          message: "Invalid tunnel slug. Use 3-32 lowercase letters, numbers, or hyphens.",
        });
        ws.close();
        return;
      }

      const result = registerTunnel(message.tunnel, ws.raw);

      if (!result.ok) {
        sendMessage(ws, {
          type: "error",
          message: result.reason === "already_registered"
            ? "Already registered"
            : "Tunnel slug already in use",
        });

        if (result.reason === "taken") {
          ws.close();
        }

        return;
      }

      if (pending) {
        pending.registered = true;
        clearRegistrationTimeout(ws.raw);
      }

      const webhookUrl = `${publicUrl.replace(/\/$/, "")}/hook/${message.tunnel}`;

      sendMessage(ws, {
        type: "registered",
        tunnel: message.tunnel,
        webhookUrl,
      });
    },

    close(ws) {
      removePendingRegistration(ws.raw);
      unregisterSocket(ws.raw);
    },
  });
}
