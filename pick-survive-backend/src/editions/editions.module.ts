import { Module } from '@nestjs/common';
import { EditionsController } from './editions.controller';
import { EditionsService } from './editions.service';
import { EditionAutoManagerService } from './edition-auto-manager.service';
import { EditionCloseService } from './edition-close.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PointsModule } from '../points/points.module';
import { CoinsModule } from '../coins/coins.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [PrismaModule, LedgerModule, PointsModule, CoinsModule, AchievementsModule],
  controllers: [EditionsController],
  providers: [EditionsService, EditionAutoManagerService, EditionCloseService],
  exports: [EditionsService, EditionAutoManagerService, EditionCloseService]
})
export class EditionsModule {}
