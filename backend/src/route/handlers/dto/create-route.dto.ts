import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { PointDto } from "../../../common/dto/point.dto";
import { STYLE_TAGS, type StyleTag } from "../../../places/style-tag";
import type { RouteQuery } from "../../services/route-planner";

const MIN_DURATION = 15;
const MAX_DURATION = 720;
const MAX_TAGS = 20;

export class CreateRouteDto {
  @ValidateNested()
  @Type(() => PointDto)
  start!: PointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  end?: PointDto;

  @IsOptional()
  @IsISO8601({ strict: true })
  startTime?: string;

  @IsInt()
  @Min(MIN_DURATION)
  @Max(MAX_DURATION)
  durationMinutes!: number;

  @IsBoolean()
  wheelchair!: boolean;

  @IsArray()
  @ArrayMaxSize(MAX_TAGS)
  @IsIn(STYLE_TAGS, { each: true })
  tags!: StyleTag[];

  toQuery(): RouteQuery {
    return {
      start: this.start,
      end: this.end ?? this.start,
      durationMinutes: this.durationMinutes,
      wheelchair: this.wheelchair,
      tags: this.tags,
      startTime: this.startTime ? new Date(this.startTime) : undefined,
    };
  }
}
