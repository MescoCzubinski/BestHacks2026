import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

const MIN_PASSWORD_LENGTH = 8;

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  password!: string;
}
