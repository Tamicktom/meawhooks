# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/

RUN bun install --frozen-lockfile --filter @meawhooks/api

FROM oven/bun:1.3.14 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src

WORKDIR /app/apps/api
RUN bun run build

FROM oven/bun:1.3.14-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/apps/api/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "dist/index.js"]
