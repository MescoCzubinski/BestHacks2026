import { apiFetch } from "./client";

export type Tag = {
  id: string;
  group: "style" | "influence" | "type" | "special";
  label: string;
};

export type MatchedTag = Tag & { score: number };

export async function listTags(signal?: AbortSignal): Promise<Tag[]> {
  const res = await apiFetch("/tags", { signal });
  if (!res.ok) throw new Error(`Tags request failed: ${res.status}`);
  return res.json();
}

export async function matchTags(
  text: string,
  signal?: AbortSignal,
): Promise<MatchedTag[]> {
  const res = await apiFetch(`/tags/match?text=${encodeURIComponent(text)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Tag match failed: ${res.status}`);
  return res.json();
}
