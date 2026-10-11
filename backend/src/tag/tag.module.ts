import { Module } from "@nestjs/common";
import { EmbeddingController } from "./handlers/embedding.controller";
import { TagController } from "./handlers/tag.controller";
import { Embedder } from "./services/embedder";
import { EmbeddingService } from "./services/embedding.service";
import { TagMatcherService } from "./services/tag-matcher.service";
import { TagRankingService } from "./services/tag-ranking.service";
import { TagQueryService } from "./services/tag-query.service";
import { TransformersEmbedder } from "./services/transformers-embedder.service";

@Module({
  controllers: [TagController, EmbeddingController],
  providers: [
    TagQueryService,
    TagMatcherService,
    TagRankingService,
    EmbeddingService,
    { provide: Embedder, useClass: TransformersEmbedder },
  ],
  exports: [TagQueryService, TagMatcherService],
})
export class TagModule {}
