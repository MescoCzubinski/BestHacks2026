import { Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { ExpensiveRateLimit } from "../../common/rate-limit/rate-limit";
import { EmbeddingModelLifecycle } from "../services/embedding-model-lifecycle.service";
import { TagMatcherService } from "../services/tag-matcher.service";
import { TagQueryService } from "../services/tag-query.service";
import { MatchTagsDto } from "./dto/match-tags.dto";

@Controller("tags")
export class TagController {
  constructor(
    private readonly tags: TagQueryService,
    private readonly matcher: TagMatcherService,
    private readonly model: EmbeddingModelLifecycle,
  ) {}

  @Get()
  list() {
    return this.tags.list();
  }

  @Get("match")
  @ExpensiveRateLimit()
  match(@Query() dto: MatchTagsDto) {
    return this.matcher.match(dto.text);
  }

  /** The frontend calls it when a session starts so matching is fast later. */
  @Post("warmup")
  @HttpCode(202)
  @ExpensiveRateLimit()
  warmup(): void {
    this.model.warmup();
  }
}
