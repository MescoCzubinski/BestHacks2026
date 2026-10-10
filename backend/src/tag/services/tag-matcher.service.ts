import { Injectable } from "@nestjs/common";
import { rankTags, type TagVector } from "../lib/rank-tags";
import type { StyleTag } from "../../places/style-tag";
import { TAG_PHRASES } from "../tag-phrases";
import { Embedder } from "./embedder";
import { TagQueryService, type TagView } from "./tag-query.service";

export type MatchedTag = TagView & { score: number };

@Injectable()
export class TagMatcherService {
  private tagVectors?: Promise<TagVector<StyleTag>[]>;

  constructor(
    private readonly tags: TagQueryService,
    private readonly embedder: Embedder,
  ) {}

  async match(text: string): Promise<MatchedTag[]> {
    const vectors = await this.loadTagVectors();
    const [query] = await this.embedder.embed([text.trim()]);
    if (!query) return [];
    const byId = new Map(this.tags.list().map((tag) => [tag.id, tag]));
    return rankTags(query, vectors).flatMap(({ id, score }) => {
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
