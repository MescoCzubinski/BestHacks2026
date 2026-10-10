/** Turns texts into normalized embedding vectors; swap the model without touching the callers. */
export abstract class Embedder {
  abstract embed(texts: string[]): Promise<number[][]>;
}
