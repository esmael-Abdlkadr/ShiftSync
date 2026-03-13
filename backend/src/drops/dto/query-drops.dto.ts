import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DropRequestStatus } from '@prisma/client';

export class QueryDropsDto {
  @IsEnum(DropRequestStatus)
  @IsOptional()
  status?: DropRequestStatus;

  @IsString()
  @IsOptional()
  locationId?: string;
}
