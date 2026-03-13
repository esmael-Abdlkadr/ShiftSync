import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ReviewSwapDto {
  @IsBoolean()
  approve: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
