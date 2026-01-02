import { IsString, IsNumber, Min, IsOptional, IsIn, IsObject, MinLength } from 'class-validator';

export class CreateEditionDto {
  @IsString()
  @MinLength(3, { message: 'El nombre de la edición debe tener al menos 3 caracteres' })
  name: string;

  @IsIn(['ELIMINATORIO', 'LIGA'], { message: 'El modo debe ser ELIMINATORIO o LIGA' })
  mode: 'ELIMINATORIO' | 'LIGA';

  @IsNumber()
  @Min(1, { message: 'La jornada de inicio debe ser mayor a 0' })
  startMatchday: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'La jornada de fin debe ser mayor a 0' })
  endMatchday?: number;

  @IsOptional()
  @IsObject()
  configJson?: any;
}

