import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRateLimit } from "../../common/rate-limit/rate-limit";
import { EmbeddingService } from "../services/embedding.service";
import { EmbedTextsDto } from "./dto/embed-texts.dto";

@InternalRateLimit()
@Controller("embeddings")
export class EmbeddingController {
  constructor(private readonly embeddings: EmbeddingService) {}

  @Post()
  @HttpCode(200)
  embed(@Body() dto: EmbedTextsDto) {
    return this.embeddings.embed(dto.texts);
  }
}
