import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PointDto } from "../../../common/dto/point.dto";
import { STYLE_TAGS } from "../../../places/style-tag";

const MAX_STOPS = 100;
const MAX_TAGS = 20;
const MAX_DURATION = 720;

export class SavedStopDto {
  @IsString()
  @MaxLength(64)
  id!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DURATION)
  visitMinutes!: number;
}

export class CreateSavedRouteDto {
  @IsArray()
  @ArrayMaxSize(MAX_TAGS)
  @IsIn(STYLE_TAGS, { each: true })
  tags!: string[];

  @IsInt()
  @Min(1)
  @Max(MAX_DURATION)
  durationMinutes!: number;

  @ValidateNested()
  @Type(() => PointDto)
  start!: PointDto;

  @ValidateNested()
  @Type(() => PointDto)
  end!: PointDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_STOPS)
  @ValidateNested({ each: true })
  @Type(() => SavedStopDto)
  stops!: SavedStopDto[];
}
