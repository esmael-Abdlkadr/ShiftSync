import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateShiftDto {
  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  skillId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  headcount?: number;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  editCutoffHours?: number;
}
