import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';

export class GetRankingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  @IsIn(['points', 'wins', 'participation'])
  sortBy?: 'points' | 'wins' | 'participation';
}

