import { Module } from "@nestjs/common";
import { EmbeddingController } from "./handlers/embedding.controller";
import { TagController } from "./handlers/tag.controller";
import { EmbeddingModel } from "./services/embedding.model";
import { TagService } from "./services/tag.service";

@Module({
  controllers: [TagController, EmbeddingController],
  providers: [TagService, EmbeddingModel],
})
export class TagModule {}
