# meawhooks

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

In another terminal, run the CLI:

```bash
bun hello
```

Or run the CLI directly from its workspace:

```bash
bun run --filter @meawhooks/cli hello-world
```

## Build

```bash
bun run build
```

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/hello-world` | `{ "message": "Hello, World!" }` |

Default API URL: `http://localhost:3000`

## Environment Variables

| Variable | App | Default | Description |
|----------|-----|---------|-------------|
| `PORT` | API | `3000` | HTTP server port |
| `API_URL` | CLI | `http://localhost:3000` | Base URL for API requests |

## Project Structure

```text
apps/
├── api/   # ElysiaJS back-end
└── cli/   # Ink CLI
```
