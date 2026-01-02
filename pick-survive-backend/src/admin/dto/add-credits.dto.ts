import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class AddCreditsDto {
  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  amountCents: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

