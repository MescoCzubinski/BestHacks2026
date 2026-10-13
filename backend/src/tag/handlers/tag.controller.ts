import { Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { TagService } from "../services/tag.service";
import { MatchTagsDto } from "./dto/match-tags.dto";

@Controller("tags")
export class TagController {
  constructor(private readonly tags: TagService) {}

  @Get()
  list() {
    return this.tags.list();
  }

  @Get("match")
  match(@Query() dto: MatchTagsDto) {
    return this.tags.match(dto.text);
  }

  /** The frontend calls it when a session starts so matching is fast later. */
  @Post("warmup")
  @HttpCode(202)
  warmup(): void {
    this.tags.warmup();
  }
}
