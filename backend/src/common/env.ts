const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GRAPHHOPPER_URL",
  "GRAPHHOPPER_TOKEN",
  "EMBEDDING_MODEL",
] as const;

export function validateEnv(env: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
  if (String(env.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return env;
}
