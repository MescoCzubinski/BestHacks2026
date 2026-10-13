# Ingress

The only public entry point. `/` goes to the frontend (`frontend:3000`), and only the
public `/api` routes go to the backend (`backend:8000`); every other `/api` path is a 404,
so internal routes such as the fetcher's bulk `POST /api/embeddings` are reachable only
inside the network. The backend, the database and the fetcher publish no ports.

- `public-routes.json` is the single allowlist. The Vite dev proxy (`frontend/vite.config.ts`)
  reads it directly; `nginx.conf` is generated from it.
- After changing the allowlist, regenerate the config (CI fails when it is out of date):

```
node ingress/render-nginx.mjs
```

- The backend trusts one proxy hop (`trust proxy`), so its rate limit uses the client IP
  that nginx appends to `X-Forwarded-For`.
- Secrets (database passwords, `GRAPHHOPPER_TOKEN`) come from env files or cluster secrets,
  never from git.
