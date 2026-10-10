export abstract class Embedder {
  abstract embed(texts: string[]): Promise<number[][]>;
}
