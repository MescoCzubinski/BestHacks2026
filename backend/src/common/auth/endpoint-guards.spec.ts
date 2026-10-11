import "reflect-metadata";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { IS_PUBLIC_KEY } from "./decorators";

const SRC = join(__dirname, "..", "..");
const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";
const REQUEST_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

// The only endpoints reachable without a user token, and why.
const ANONYMOUS = new Set([
  "GET /health", // container and fetcher health checks
  "POST /auth/register", // creates the account that then gets a token
  "POST /auth/login", // exchanges credentials for a token
  "POST /embeddings", // behind ServiceTokenGuard (service-to-service)
]);

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return name.endsWith(".controller.js") ? [full] : [];
  });
}

function endpoints() {
  const found: { route: string; isPublic: boolean; guardNames: string[] }[] =
    [];
  for (const file of controllerFiles(SRC)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    for (const cls of Object.values(require(file)) as (new () => unknown)[]) {
      const base = Reflect.getMetadata(PATH_METADATA, cls) as
        string | undefined;
      if (base === undefined) continue;
      const proto = cls.prototype as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(proto)) {
        const handler = proto[key];
        if (typeof handler !== "function" || key === "constructor") continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          number | undefined;
        if (method === undefined) continue;
        const sub = Reflect.getMetadata(PATH_METADATA, handler) as string;
        const guards = [
          ...((Reflect.getMetadata(GUARDS_METADATA, cls) as
            { name: string }[] | undefined) ?? []),
          ...((Reflect.getMetadata(GUARDS_METADATA, handler) as
            { name: string }[] | undefined) ?? []),
        ];
        const isPublic =
          Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
          Reflect.getMetadata(IS_PUBLIC_KEY, cls) === true;
        found.push({
          route: `${REQUEST_METHODS[method]} /${[base, sub]
            .map((p) => p.replace(/^\/|\/$/g, ""))
            .filter((p) => p && p !== "/")
            .join("/")}`,
          isPublic,
          guardNames: guards.map((g) => g.name),
        });
      }
    }
  }
  return found;
}

describe("endpoint protection", () => {
  const all = endpoints();

  it("discovers the controllers", () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it("leaves only the listed endpoints open to anonymous callers", () => {
    const open = all.filter((e) => e.isPublic).map((e) => e.route);
    expect(new Set(open)).toEqual(ANONYMOUS);
  });

  it("puts the service-token guard on the embeddings endpoint", () => {
    const embeddings = all.find((e) => e.route === "POST /embeddings");
    expect(embeddings?.guardNames).toContain("ServiceTokenGuard");
  });

  it("requires a user token on everything else", () => {
    const protectedRoutes = all.filter((e) => !e.isPublic).map((e) => e.route);
    expect(protectedRoutes).toEqual(
      expect.arrayContaining([
        "GET /auth/me",
        "POST /routes",
        "GET /paths",
        "GET /places",
        "GET /locations",
        "GET /locations/reverse",
        "GET /tags",
        "GET /tags/match",
        "GET /saved-routes",
        "POST /saved-routes",
        "DELETE /saved-routes/:id",
      ]),
    );
  });
});
