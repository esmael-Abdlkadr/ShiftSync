import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SwapRequestStatus } from '@prisma/client';

export class QuerySwapsDto {
  @IsEnum(SwapRequestStatus)
  @IsOptional()
  status?: SwapRequestStatus;

  @IsString()
  @IsOptional()
  locationId?: string;
}
