import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class AwardPointsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  editionId: string;

  @IsInt()
  @Min(1)
  matchday: number;

  @IsInt()
  @Min(1)
  points: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  metaJson?: any;
}

