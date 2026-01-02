import { Module } from '@nestjs/common';
import { FootballDataService } from './football-data.service';
import { FootballDataController } from './football-data.controller';
import { SyncService } from './sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FootballDataService, SyncService],
  controllers: [FootballDataController],
  exports: [FootballDataService, SyncService],
})
export class FootballDataModule {}
