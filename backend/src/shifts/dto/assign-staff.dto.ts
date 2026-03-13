import { IsString, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { OverrideReason } from '@prisma/client';

export class AssignStaffDto {
  @IsString()
  userId: string;

  @IsEnum(OverrideReason)
  @IsOptional()
  overrideReason?: OverrideReason;

  @ValidateIf((o) => !!o.overrideReason)
  @IsString()
  overrideNotes?: string;
}
