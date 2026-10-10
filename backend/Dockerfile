# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./

FROM base AS deps
RUN --mount=type=cache,target=/home/node/.npm,uid=1000 npm ci

# Watch mode (compose bind-mounts the source)
FROM deps AS dev
COPY --chown=node:node . .
EXPOSE 8000
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
RUN npm run build

FROM base AS prod-deps
RUN --mount=type=cache,target=/home/node/.npm,uid=1000 npm ci --omit=dev

# Production (default target)
FROM base AS prod
ENV NODE_ENV=production PORT=8000
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/main.js"]
