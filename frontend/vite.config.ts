import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

export type PublicRoutes = { prefix: string[]; exact: string[] };

const PUBLIC_ROUTES_FILE = path.resolve(
  import.meta.dirname,
  "../ingress/public-routes.json",
);

export function isPublicApiPath(url: string, routes: PublicRoutes): boolean {
  const pathname = url.split("?")[0] ?? "";
  return (
    routes.exact.includes(pathname) ||
    routes.prefix.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

function apiAllowlist(routes: PublicRoutes): Plugin {
  return {
    name: "api-allowlist",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/") && !isPublicApiPath(req.url, routes)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const dev = command === "serve";
  const routes: PublicRoutes | null = dev
    ? JSON.parse(readFileSync(PUBLIC_ROUTES_FILE, "utf-8"))
    : null;
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(routes ? [apiAllowlist(routes)] : []),
    ],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: {
      host: true,
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
          xfwd: true,
        },
      },
    },
  };
});
