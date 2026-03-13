import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ReviewDropDto {
  @IsBoolean()
  approve: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
