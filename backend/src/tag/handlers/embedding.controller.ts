import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRateLimit } from "../../common/rate-limit/rate-limit";
import { EmbeddingService } from "../services/embedding.service";
import { EmbedTextsDto } from "./dto/embed-texts.dto";

/** Internal: bulk embedding for the fetcher. Outside the /api prefix, so the ingress never exposes it. */
@Controller("internal/embeddings")
export class EmbeddingController {
  constructor(private readonly embeddings: EmbeddingService) {}

  @Post()
  @HttpCode(200)
  @InternalRateLimit()
  embed(@Body() dto: EmbedTextsDto) {
    return this.embeddings.embed(dto.texts);
  }
}
