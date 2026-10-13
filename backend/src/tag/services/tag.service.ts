import { Injectable } from "@nestjs/common";
import { TAG_GROUPS, type StyleTag } from "../../common/types/style-tag";
import { EmbeddingModel } from "./embedding.model";
import { TAG_LABELS } from "./tag-labels";
import { TAG_PHRASES } from "./tag-phrases";

const MIN_SCORE = 0.74;
const SCORE_MARGIN = 0.06;
export const MAX_MATCHES = 3;

export type TagGroup = keyof typeof TAG_GROUPS;
export type TagView = { id: StyleTag; group: TagGroup; label: string };
export type MatchedTag = TagView & { score: number };
export type EmbeddingResult = { dimensions: number; vectors: number[][] };
export type TagVector<T> = { id: T; vector: number[] };
export type ScoredTag<T> = { id: T; score: number };

export function similarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

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

@Injectable()
export class TagService {
  private tagVectors?: Promise<TagVector<StyleTag>[]>;

  constructor(private readonly model: EmbeddingModel) {}

  list(): TagView[] {
    return (Object.keys(TAG_GROUPS) as TagGroup[]).flatMap((group) =>
      TAG_GROUPS[group].map((id) => ({ id, group, label: TAG_LABELS[id] })),
    );
  }

  async match(text: string): Promise<MatchedTag[]> {
    const vectors = await this.loadTagVectors();
    const [query] = await this.model.embed([text.trim()]);
    if (!query) return [];
    const byId = new Map(this.list().map((tag) => [tag.id, tag]));
    return rankTags(query, vectors).flatMap(({ id, score }) => {
      const tag = byId.get(id);
      return tag ? [{ ...tag, score }] : [];
    });
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const vectors = await this.model.embed(texts.map((t) => t.trim()));
    return { dimensions: vectors[0]?.length ?? 0, vectors };
  }

  warmup(): void {
    this.model.warmup();
  }

  private loadTagVectors(): Promise<TagVector<StyleTag>[]> {
    this.tagVectors ??= this.embedAllTags().catch((error) => {
      this.tagVectors = undefined;
      throw error;
    });
    return this.tagVectors;
  }

  private async embedAllTags(): Promise<TagVector<StyleTag>[]> {
    const entries = this.list().flatMap((tag) =>
      [tag.label, ...TAG_PHRASES[tag.id].split(", ")].map((text) => ({
        id: tag.id,
        text: text.trim(),
      })),
    );
    const vectors = await this.model.embed(entries.map((e) => e.text));
    return entries.map((entry, i) => ({
      id: entry.id,
      vector: vectors[i] ?? [],
    }));
  }
}
