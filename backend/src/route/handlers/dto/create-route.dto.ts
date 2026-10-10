import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { STYLE_TAGS, type StyleTag } from "../../../places/style-tag";
import type { RouteQuery } from "../../services/route-planner";

export const MIN_DURATION = 15; // minutes
export const MAX_DURATION = 720; // minutes
export const MAX_TAGS = 20;

export class PointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class CreateRouteDto {
  @ValidateNested()
  @Type(() => PointDto)
  start!: PointDto;

  /** Defaults to the start: a round trip. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  end?: PointDto;

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
    };
  }
}
