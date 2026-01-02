import { IsString, IsOptional } from 'class-validator';

export class JoinLeagueDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  code?: string;
}

