import { IsBoolean } from 'class-validator';

export class RespondSwapDto {
  @IsBoolean()
  accept: boolean;
}
