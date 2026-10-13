import { apiFetch } from "./client";

let requested = false;

export async function warmUp(): Promise<void> {
  if (requested) return;
  requested = true;
  try {
    await apiFetch("/embeddings/warmup", { method: "POST" });
  } catch {}
}
