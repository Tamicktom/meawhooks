# meawhooks

Webhook capture server with a CLI that forwards incoming webhooks to a local listener via WebSocket.

Monorepo with Bun, Turborepo, ElysiaJS (API), and Ink (CLI).

## Prerequisites

- [Bun](https://bun.sh/) 1.3+

## Setup

```bash
bun install
```

## Development

Start the API in watch mode:

```bash
bun dev
```

In another terminal, run the CLI listener:

```bash
meawhooks listen --tunnel my-app http://localhost:8080/webhooks
```

Or from the monorepo root with example defaults:

```bash
bun listen
```

Or run the CLI directly from its workspace:

```bash
bun run --filter @meawhooks/cli listen -- --tunnel my-app http://localhost:8080/webhooks
```

## Build

```bash
bun run build
```

## How it works

1. CLI connects to the API via WebSocket and registers a tunnel slug.
2. The API exposes a public webhook URL: `{PUBLIC_URL}/hook/{tunnel}`.
3. Any HTTP method hitting that URL is forwarded to the CLI over WebSocket.
4. The API responds `202 Accepted` immediately (fire-and-forget).
5. The CLI forwards the request to your local target URL.

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{ "status": "ok" }` |
| WS | `/ws` | WebSocket tunnel registration |
| ALL | `/hook/:tunnel` | Accept webhook, forward to CLI |
| ALL | `/hook/:tunnel/*` | Accept webhook with path suffix |

Default API URL: `http://localhost:3000`

## Manual validation

1. Start the API: `bun dev`
2. Start a local server: `bun -e "Bun.serve({ port: 9999, fetch: r => new Response('ok') })"`
3. Start the CLI: `meawhooks listen --tunnel test http://localhost:9999/hook`
4. Send a webhook: `curl -X POST http://localhost:3000/hook/test/payload -d '{"a":1}'`
5. Expect: API returns `202`; CLI shows the event; local server receives `POST /hook/payload`

## Environment Variables

| Variable | App | Default | Description |
|----------|-----|---------|-------------|
| `PORT` | API | `3000` | HTTP server port |
| `PUBLIC_URL` | API | `http://localhost:3000` | Public base URL shown for webhooks |
| `API_URL` | CLI | `http://localhost:3000` | Base URL for API (WebSocket derived from this) |

## Project Structure

```text
apps/
├── api/   # ElysiaJS back-end
└── cli/   # Ink CLI
```
