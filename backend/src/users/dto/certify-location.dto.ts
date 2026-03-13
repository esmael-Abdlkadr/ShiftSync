import { IsString, IsNotEmpty } from 'class-validator';

export class CertifyLocationDto {
  @IsString()
  @IsNotEmpty()
  locationId: string;
}
