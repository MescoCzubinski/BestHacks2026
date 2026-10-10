import { IsString, MaxLength, MinLength } from "class-validator";

export class MatchTagsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  text!: string;
}
