import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  timezone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  desiredWeeklyHours?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  hourlyRate?: number;
}
