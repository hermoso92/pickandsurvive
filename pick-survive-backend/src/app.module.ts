import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EditionsModule } from './editions/editions.module';
import { PicksModule } from './picks/picks.module';
import { MatchesModule } from './matches/matches.module';
import { FootballDataModule } from './football-data/football-data.module';
import { LeaguesModule } from './leagues/leagues.module';
import { LedgerModule } from './ledger/ledger.module';
import { AdminModule } from './admin/admin.module';
import { PointsModule } from './points/points.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ShopModule } from './shop/shop.module';
import { RankingsModule } from './rankings/rankings.module';
import { CoinsModule } from './coins/coins.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule, 
    AuthModule, 
    EditionsModule, 
    PicksModule, 
    MatchesModule,
    FootballDataModule,
    LeaguesModule,
    LedgerModule,
    AdminModule,
    PointsModule,
    AchievementsModule,
    ShopModule,
    RankingsModule,
    CoinsModule
  ], 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}