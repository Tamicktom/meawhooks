//* Libraries imports
import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";

//* Local imports
import { forwardWebhook } from "../lib/forward-webhook";
import { toWebSocketUrl, type ServerMessage, type WebhookEvent } from "../lib/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type ListenCommandProps = {
  tunnel: string;
  targetUrl: string;
};

type WebhookLogEntry = {
  id: string;
  method: string;
  path: string;
  result: "success" | "failure";
  detail: string;
};

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000;

export function ListenCommand(props: ListenCommandProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [receivedCount, setReceivedCount] = useState(0);
  const [forwardedCount, setForwardedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<WebhookLogEntry[]>([]);

  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    const apiUrl = process.env.API_URL ?? "http://localhost:3000";
    const wsBaseUrl = toWebSocketUrl(apiUrl);

    function appendLog(entry: WebhookLogEntry) {
      setRecentLogs((current) => [entry, ...current].slice(0, 5));
    }

    function handleWebhookEvent(event: WebhookEvent) {
      setReceivedCount((count) => count + 1);

      forwardWebhook(props.targetUrl, event)
        .then((result) => {
          if (result.ok) {
            setForwardedCount((count) => count + 1);
            appendLog({
              id: event.id,
              method: event.method,
              path: event.path || "/",
              result: "success",
              detail: String(result.status),
            });
            return;
          }

          setFailedCount((count) => count + 1);
          appendLog({
            id: event.id,
            method: event.method,
            path: event.path || "/",
            result: "failure",
            detail: result.error,
          });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error occurred";
          setFailedCount((count) => count + 1);
          appendLog({
            id: event.id,
            method: event.method,
            path: event.path || "/",
            result: "failure",
            detail: message,
          });
        });
    }

    function handleServerMessage(message: ServerMessage) {
      if (message.type === "registered") {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        setConnectionStatus("connected");
        setWebhookUrl(message.webhookUrl);
        setErrorMessage("");
        return;
      }

      if (message.type === "error") {
        setConnectionStatus("error");
        setErrorMessage(message.message);
        return;
      }

      if (message.type === "webhook") {
        handleWebhookEvent(message);
      }
    }

    function scheduleReconnect() {
      if (!shouldReconnectRef.current) {
        return;
      }

      setConnectionStatus("disconnected");

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelayRef.current);

      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        MAX_RECONNECT_DELAY_MS,
      );
    }

    function connect() {
      setConnectionStatus("connecting");
      setErrorMessage("");

      const socket = new WebSocket(`${wsBaseUrl}/ws`);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "register", tunnel: props.tunnel }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;
          handleServerMessage(message);
        } catch {
          setConnectionStatus("error");
          setErrorMessage("Invalid message from server");
        }
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        setConnectionStatus("error");
        setErrorMessage("WebSocket connection error");
      });
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      socketRef.current?.close();
    };
  }, [props.tunnel, props.targetUrl]);

  return (
    <Box flexDirection="column">
      <Text bold>Meawhooks listen</Text>
      <Text>Tunnel: {props.tunnel}</Text>
      <Text>Target: {props.targetUrl}</Text>
      <Text>
        Status:{" "}
        <Text
          color={
            connectionStatus === "connected"
              ? "green"
              : connectionStatus === "error"
                ? "red"
                : "yellow"
          }
        >
          {connectionStatus}
        </Text>
      </Text>
      {webhookUrl ? <Text>Webhook URL: {webhookUrl}</Text> : null}
      {errorMessage ? <Text color="red">Error: {errorMessage}</Text> : null}
      <Text>
        Received: {receivedCount} | Forwarded: {forwardedCount} | Failed: {failedCount}
      </Text>
      {recentLogs.length > 0 ? (
        <Box flexDirection="column" paddingTop={1}>
          <Text bold>Recent webhooks</Text>
          {recentLogs.map((entry) => (
            <Text key={entry.id}>
              [{entry.result === "success" ? "OK" : "ERR"}] {entry.method} {entry.path} — {entry.detail}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
