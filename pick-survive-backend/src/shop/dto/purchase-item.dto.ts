import { IsString, IsNotEmpty } from 'class-validator';

export class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;
}

