import { IsNumber, Min } from 'class-validator';

export class UpdateResultDto {
  @IsNumber()
  @Min(0, { message: 'Los goles del equipo local deben ser mayor o igual a 0' })
  homeGoals: number;

  @IsNumber()
  @Min(0, { message: 'Los goles del equipo visitante deben ser mayor o igual a 0' })
  awayGoals: number;
}

