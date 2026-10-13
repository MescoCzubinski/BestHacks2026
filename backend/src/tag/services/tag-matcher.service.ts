import { Injectable } from "@nestjs/common";
import type { StyleTag } from "../../common/types/style-tag";
import { TAG_PHRASES } from "./tag-phrases";
import { Embedder } from "./embedder";
import { TagRankingService, type TagVector } from "./tag-ranking.service";
import { TagQueryService, type TagView } from "./tag-query.service";

export type MatchedTag = TagView & { score: number };

@Injectable()
export class TagMatcherService {
  private tagVectors?: Promise<TagVector<StyleTag>[]>;

  constructor(
    private readonly tags: TagQueryService,
    private readonly embedder: Embedder,
    private readonly ranking: TagRankingService,
  ) {}

  async match(text: string): Promise<MatchedTag[]> {
    const vectors = await this.loadTagVectors();
    const [query] = await this.embedder.embed([text.trim()]);
    if (!query) return [];
    const byId = new Map(this.tags.list().map((tag) => [tag.id, tag]));
    return this.ranking.rank(query, vectors).flatMap(({ id, score }) => {
      const tag = byId.get(id);
      return tag ? [{ ...tag, score }] : [];
    });
  }

  private loadTagVectors(): Promise<TagVector<StyleTag>[]> {
    this.tagVectors ??= this.embedAllTags().catch((error) => {
      this.tagVectors = undefined;
      throw error;
    });
    return this.tagVectors;
  }

  private async embedAllTags(): Promise<TagVector<StyleTag>[]> {
    const entries = this.tags.list().flatMap((tag) =>
      [tag.label, ...TAG_PHRASES[tag.id].split(", ")].map((text) => ({
        id: tag.id,
        text: text.trim(),
      })),
    );
    const vectors = await this.embedder.embed(entries.map((e) => e.text));
    return entries.map((entry, i) => ({
      id: entry.id,
      vector: vectors[i] ?? [],
    }));
  }
}
