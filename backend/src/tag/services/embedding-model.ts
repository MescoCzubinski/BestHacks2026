export type EmbeddingModel = {
  embed(texts: string[]): Promise<number[][]>;
  dispose(): Promise<void>;
};

export abstract class EmbeddingModelLoader {
  abstract load(): Promise<EmbeddingModel>;
}
