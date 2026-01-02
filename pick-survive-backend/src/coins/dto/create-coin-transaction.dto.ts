import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, IsIn } from 'class-validator';

export class CreateCoinTransactionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  coins: number; // Positivo = ganado, Negativo = gastado

  @IsString()
  @IsIn(['MATCHDAY_WIN', 'SHOP_PURCHASE', 'BONUS'])
  type: 'MATCHDAY_WIN' | 'SHOP_PURCHASE' | 'BONUS';

  @IsString()
  @IsOptional()
  editionId?: string;

  @IsInt()
  @IsOptional()
  matchday?: number;

  @IsOptional()
  metaJson?: any;
}

