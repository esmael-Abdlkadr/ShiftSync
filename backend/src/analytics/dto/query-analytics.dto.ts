import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryAnalyticsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}
