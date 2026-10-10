import { Injectable } from "@nestjs/common";
import { Embedder } from "./embedder";

export type EmbeddingResult = {
  dimensions: number;
  /** One normalized vector per input text, in order. */
  vectors: number[][];
};

@Injectable()
export class EmbeddingService {
  constructor(private readonly embedder: Embedder) {}

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const vectors = await this.embedder.embed(texts.map((t) => t.trim()));
    return { dimensions: vectors[0]?.length ?? 0, vectors };
  }
}
