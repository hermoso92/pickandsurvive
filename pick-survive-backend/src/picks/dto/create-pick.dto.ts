import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreatePickDto {
  @IsString({ message: 'El ID del equipo debe ser una cadena de texto válida' })
  @IsNotEmpty({ message: 'El ID del equipo es requerido' })
  teamId: string;

  @IsOptional()
  @IsBoolean({ message: 'skipDeadline debe ser un valor booleano' })
  skipDeadline?: boolean;
}

