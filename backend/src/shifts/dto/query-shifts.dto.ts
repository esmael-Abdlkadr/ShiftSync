import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ShiftStatus } from '@prisma/client';

export class QueryShiftsDto {
  @IsString()
  @IsOptional()
  locationId?: string;

  @IsDateString()
  @IsOptional()
  weekStart?: string;

  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;

  @IsString()
  @IsOptional()
  skillId?: string;
}
