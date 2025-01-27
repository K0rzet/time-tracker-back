import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
  @IsBoolean()
  isPaid?: boolean;
} 