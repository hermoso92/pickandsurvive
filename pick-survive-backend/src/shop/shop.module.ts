import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
  imports: [PrismaModule, CoinsModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}

