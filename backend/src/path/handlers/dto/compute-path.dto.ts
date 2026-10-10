import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class PointDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lon!: number;
}

export const MAX_PATH_POINTS = 30;

export class ComputePathDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(MAX_PATH_POINTS)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(7)
  walkingSpeedKmh?: number;
}
