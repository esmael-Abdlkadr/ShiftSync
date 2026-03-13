import { IsString } from 'class-validator';

export class CreateSwapRequestDto {
  @IsString()
  shiftId: string;

  @IsString()
  targetUserId: string;
}
