import { Module } from "@nestjs/common";
import { EmbeddingController } from "./handlers/embedding.controller";
import { TagController } from "./handlers/tag.controller";
import { Embedder } from "./services/embedder";
import { EmbeddingModelLoader } from "./services/embedding-model";
import { EmbeddingModelLifecycle } from "./services/embedding-model-lifecycle.service";
import { EmbeddingService } from "./services/embedding.service";
import { ModelEmbedder } from "./services/model-embedder.service";
import { TagMatcherService } from "./services/tag-matcher.service";
import { TagQueryService } from "./services/tag-query.service";
import { TagRankingService } from "./services/tag-ranking.service";
import { TransformersModelLoader } from "./services/transformers-model-loader.service";

@Module({
  controllers: [TagController, EmbeddingController],
  providers: [
    TagQueryService,
    TagMatcherService,
    TagRankingService,
    EmbeddingService,
    EmbeddingModelLifecycle,
    { provide: EmbeddingModelLoader, useClass: TransformersModelLoader },
    { provide: Embedder, useClass: ModelEmbedder },
  ],
})
export class TagModule {}
