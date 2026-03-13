import { IsString, IsOptional, IsInt, Min, Max, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  desiredWeeklyHours?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  hourlyRate?: number;
}
