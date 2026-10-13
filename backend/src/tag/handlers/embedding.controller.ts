import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  ExpensiveRateLimit,
  InternalRateLimit,
} from "../../common/rate-limit/rate-limit";
import { EmbeddingModelLifecycle } from "../services/embedding-model-lifecycle.service";
import { EmbeddingService } from "../services/embedding.service";
import { EmbedTextsDto } from "./dto/embed-texts.dto";

@Controller("embeddings")
export class EmbeddingController {
  constructor(
    private readonly embeddings: EmbeddingService,
    private readonly model: EmbeddingModelLifecycle,
  ) {}

  /** Internal: bulk embedding for the fetcher, not in the ingress allowlist. */
  @Post()
  @HttpCode(200)
  @InternalRateLimit()
  embed(@Body() dto: EmbedTextsDto) {
    return this.embeddings.embed(dto.texts);
  }

  /** Public: the frontend calls it when a session starts so matching is fast later. */
  @Post("warmup")
  @HttpCode(202)
  @ExpensiveRateLimit()
  warmup(): void {
    this.model.warmup();
  }
}
