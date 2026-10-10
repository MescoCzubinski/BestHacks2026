import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export const MAX_TEXTS = 64;
export const MAX_TEXT_LENGTH = 2000;

export class EmbedTextsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TEXTS)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(MAX_TEXT_LENGTH, { each: true })
  texts!: string[];
}
