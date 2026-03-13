import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftDto {
  @IsString()
  locationId: string;

  @IsString()
  skillId: string;

  @IsDateString()
  date: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  headcount: number;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  editCutoffHours?: number;
}
