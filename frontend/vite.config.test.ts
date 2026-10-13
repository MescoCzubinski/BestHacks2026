import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPublicApiPath, type PublicRoutes } from "./vite.config";

const routes: PublicRoutes = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, "../ingress/public-routes.json"),
    "utf-8",
  ),
);

describe("dev proxy allowlist", () => {
  it("forwards the public routes with their sub-paths and queries", () => {
    expect(isPublicApiPath("/api/places?query=rynek", routes)).toBe(true);
    expect(isPublicApiPath("/api/locations/reverse?lat=1", routes)).toBe(true);
    expect(isPublicApiPath("/api/tags", routes)).toBe(true);
    expect(isPublicApiPath("/api/embeddings/warmup", routes)).toBe(true);
  });

  it("blocks internal routes and look-alike prefixes", () => {
    expect(isPublicApiPath("/api/embeddings", routes)).toBe(false);
    expect(isPublicApiPath("/api/health", routes)).toBe(false);
    expect(isPublicApiPath("/api/tagsx", routes)).toBe(false);
  });
});
