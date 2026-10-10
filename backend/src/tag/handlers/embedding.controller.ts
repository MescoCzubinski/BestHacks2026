import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { ServiceTokenGuard } from "../../common/auth/service-token.guard";
import { EmbeddingService } from "../services/embedding.service";
import { EmbedTextsDto } from "./dto/embed-texts.dto";

@Public()
@UseGuards(ServiceTokenGuard)
@Controller("embeddings")
export class EmbeddingController {
  constructor(private readonly embeddings: EmbeddingService) {}

  @Post()
  @HttpCode(200)
  embed(@Body() dto: EmbedTextsDto) {
    return this.embeddings.embed(dto.texts);
  }
}
