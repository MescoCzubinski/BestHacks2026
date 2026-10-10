import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { TagMatcherService } from "../services/tag-matcher.service";
import { TagQueryService } from "../services/tag-query.service";
import { MatchTagsDto } from "./dto/match-tags.dto";

@Public()
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
  match(@Query() dto: MatchTagsDto) {
    return this.matcher.match(dto.text);
  }
}
