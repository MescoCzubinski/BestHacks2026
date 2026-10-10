# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000 npm ci

FROM base AS dev
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY --chown=node:node . .
RUN npm run build

FROM node:24-alpine AS prod
RUN npm install -g serve@14 && npm cache clean --force
COPY --from=build /app/dist /app
USER node
EXPOSE 3000
CMD ["serve", "-s", "/app", "-l", "3000"]
