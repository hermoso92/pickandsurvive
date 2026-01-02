import { IsString, MinLength, IsObject, IsOptional, IsIn } from 'class-validator';

export class CreateLeagueDto {
  @IsString()
  @MinLength(3, { message: 'El nombre de la liga debe tener al menos 3 caracteres' })
  name: string;

  @IsObject()
  defaultConfigJson: any;

  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC'], { message: 'La visibilidad debe ser PRIVATE o PUBLIC' })
  visibility?: 'PRIVATE' | 'PUBLIC';
}

