import { IsString } from 'class-validator';

export class CreateDropRequestDto {
  @IsString()
  shiftId: string;
}
