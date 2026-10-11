import { Injectable } from "@nestjs/common";

export type TagVector<T> = { id: T; vector: number[] };

export type ScoredTag<T> = { id: T; score: number };

const MIN_SCORE = 0.74;
const SCORE_MARGIN = 0.06;
export const MAX_MATCHES = 3;

@Injectable()
export class TagRankingService {
  /** Dot product; the vectors are unit length, so this is the cosine similarity. */
  similarity(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
    return sum;
  }

  /** The tags closest to the query: above a minimum score and within a margin of the best one. */
  rank<T>(query: number[], tags: TagVector<T>[]): ScoredTag<T>[] {
    const best = new Map<T, number>();
    for (const { id, vector } of tags) {
      const score = this.similarity(query, vector);
      if (score > (best.get(id) ?? -Infinity)) best.set(id, score);
    }
    const scored = [...best].map(([id, score]) => ({ id, score }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.score ?? 0;
    return scored
      .filter(
        (tag) => tag.score >= MIN_SCORE && tag.score >= top - SCORE_MARGIN,
      )
      .slice(0, MAX_MATCHES);
  }
}
