import { Controller, Get, Query } from "@nestjs/common";
import { ExpensiveRateLimit } from "../../common/rate-limit/rate-limit";
import { TagMatcherService } from "../services/tag-matcher.service";
import { TagQueryService } from "../services/tag-query.service";
import { MatchTagsDto } from "./dto/match-tags.dto";

@Controller("tags")
export class TagController {
  constructor(
    private readonly tags: TagQueryService,
    private readonly matcher: TagMatcherService,
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
}
