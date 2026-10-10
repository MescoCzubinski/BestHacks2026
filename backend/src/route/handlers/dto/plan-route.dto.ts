import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { STYLE_TAGS, type StyleTag } from "../../../places/style-tag";

export class RoutePointDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lon!: number;
}

export class InterestDto {
  @IsIn(STYLE_TAGS) tag!: StyleTag;

  /** How much this interest counts relative to the others. */
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(3)
  weight?: number;
}

export class PreferencesDto {
  @IsOptional() @IsBoolean() accessible?: boolean;
  @IsOptional() @IsBoolean() freeOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  maxStops?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(7)
  walkingSpeedKmh?: number;
}

export class PlanRouteDto {
  @ValidateNested() @Type(() => RoutePointDto) start!: RoutePointDto;
  @ValidateNested() @Type(() => RoutePointDto) end!: RoutePointDto;

  @IsISO8601({ strict: true }) startTime!: string;

  /** Time the person has, from the start time until they want to be at the end point. */
  @IsInt()
  @Min(15)
  @Max(720)
  availableMinutes!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => InterestDto)
  interests!: InterestDto[];

  @IsOptional() @ValidateNested() @Type(() => PreferencesDto) preferences?: PreferencesDto;
}
