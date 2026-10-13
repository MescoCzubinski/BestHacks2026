import { apiFetch } from "./client";

let requested = false;

export async function warmUp(): Promise<void> {
  if (requested) return;
  requested = true;
  try {
    await apiFetch("/tags/warmup", { method: "POST" });
  } catch {}
}
