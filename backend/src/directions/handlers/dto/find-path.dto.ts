import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  Matches,
  MaxLength,
} from "class-validator";
import type { LatLng } from "../../services/geo";

const POINT_PATTERN = /^-?\d{1,3}(\.\d{1,8})?,-?\d{1,3}(\.\d{1,8})?$/;
export const MAX_PATH_POINTS = 30;

export class FindPathDto {
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(MAX_PATH_POINTS)
  @MaxLength(40, { each: true })
  @Matches(POINT_PATTERN, { each: true })
  point!: string[];

  toPoints(): LatLng[] {
    return this.point.map((p) => {
      const [lat, lng] = p.split(",").map(Number);
      return { lat: lat!, lng: lng! };
    });
  }
}
