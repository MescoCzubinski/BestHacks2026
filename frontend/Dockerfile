# syntax=docker/dockerfile:1

FROM oven/bun:1.3-slim AS base
WORKDIR /app
RUN chown bun:bun /app
USER bun
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS dev
COPY --chown=bun:bun . .
EXPOSE 5173
CMD ["bun", "--bun", "run", "dev"]

FROM base AS build
COPY --chown=bun:bun . .
RUN bun --bun run build

FROM oven/bun:1.3-slim AS prod
WORKDIR /srv
RUN bun add serve@14 && chown -R bun:bun /srv
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
EXPOSE 3000
CMD ["bun", "--bun", "x", "serve", "-s", "dist", "-l", "3000"]
