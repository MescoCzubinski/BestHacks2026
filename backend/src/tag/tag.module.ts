import { Module } from "@nestjs/common";
import { TagController } from "./handlers/tag.controller";
import { Embedder } from "./services/embedder";
import { TagMatcherService } from "./services/tag-matcher.service";
import { TagQueryService } from "./services/tag-query.service";
import { TransformersEmbedder } from "./services/transformers-embedder.service";

@Module({
  controllers: [TagController],
  providers: [
    TagQueryService,
    TagMatcherService,
    { provide: Embedder, useClass: TransformersEmbedder },
  ],
  exports: [TagQueryService, TagMatcherService],
})
export class TagModule {}
