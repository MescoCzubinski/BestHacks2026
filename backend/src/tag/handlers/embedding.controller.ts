import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { TagService } from "../services/tag.service";
import { EmbedTextsDto } from "./dto/embed-texts.dto";

/** Internal: bulk embedding for the fetcher. Outside the /api prefix, so the ingress never exposes it. */
@Controller("internal/embeddings")
export class EmbeddingController {
  constructor(private readonly tags: TagService) {}

  @Post()
  @HttpCode(200)
  embed(@Body() dto: EmbedTextsDto) {
    return this.tags.embed(dto.texts);
  }
}
