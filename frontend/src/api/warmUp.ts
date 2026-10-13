import { apiFetch } from "./client";

let requested = false;

/** Asks the backend to load the embedding model early; once per page load, failures ignored. */
export async function warmUp(): Promise<void> {
  if (requested) return;
  requested = true;
  try {
    await apiFetch("/embeddings/warmup", { method: "POST" });
  } catch {}
}
