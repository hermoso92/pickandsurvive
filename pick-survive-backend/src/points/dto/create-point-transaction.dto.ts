import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, IsIn } from 'class-validator';

export class CreatePointTransactionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  points: number; // Positivo = ganado, Negativo = gastado

  @IsString()
  @IsIn(['MATCHDAY_WIN', 'SHOP_PURCHASE', 'ACHIEVEMENT_UNLOCK', 'BONUS'])
  type: 'MATCHDAY_WIN' | 'SHOP_PURCHASE' | 'ACHIEVEMENT_UNLOCK' | 'BONUS';

  @IsString()
  @IsOptional()
  editionId?: string;

  @IsInt()
  @IsOptional()
  matchday?: number;

  @IsOptional()
  metaJson?: any;
}

