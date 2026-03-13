import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}
