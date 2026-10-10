export type TagVector<T> = { id: T; vector: number[] };

export type ScoredTag<T> = { id: T; score: number };

export const MIN_SCORE = 0.74; // cosine similarity below this is not a match
export const SCORE_MARGIN = 0.06; // a match must be within this of the best one
export const MAX_MATCHES = 3;

/** Dot product; equals cosine similarity for normalized vectors. */
export function similarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

/** A tag may have several vectors (one per phrase); its score is the best of them. */
export function rankTags<T>(
  query: number[],
  tags: TagVector<T>[],
): ScoredTag<T>[] {
  const best = new Map<T, number>();
  for (const { id, vector } of tags) {
    const score = similarity(query, vector);
    if (score > (best.get(id) ?? -Infinity)) best.set(id, score);
  }
  const scored = [...best].map(([id, score]) => ({ id, score }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  return scored
    .filter((tag) => tag.score >= MIN_SCORE && tag.score >= top - SCORE_MARGIN)
    .slice(0, MAX_MATCHES);
}
