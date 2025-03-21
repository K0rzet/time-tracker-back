import { IsString, IsOptional, IsBoolean, IsDate, IsDateString } from 'class-validator';

export class CreateTimerDto {
  @IsString()
  name: string;

  @IsString()
  projectId: string;
}

export class UpdateTimerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isLogged?: boolean;
} 