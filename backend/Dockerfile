# syntax=docker/dockerfile:1

FROM oven/bun:1.3-slim AS base
WORKDIR /app
RUN chown bun:bun /app
USER bun
COPY --chown=bun:bun package.json bun.lock ./

FROM base AS deps
RUN bun install --frozen-lockfile

FROM deps AS dev
COPY --chown=bun:bun . .
EXPOSE 8000
CMD ["bun", "run", "start:dev"]

FROM base AS prod-deps
RUN bun install --frozen-lockfile --production

FROM base AS prod
ENV NODE_ENV=production PORT=8000
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun tsconfig.json ./
COPY --chown=bun:bun src ./src
EXPOSE 8000
CMD ["bun", "src/main.ts"]
