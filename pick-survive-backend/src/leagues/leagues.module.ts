import { Module } from '@nestjs/common';
import { LeagueService } from './leagues.service';
import { LeaguesController, EditionsController, MeController } from './leagues.controller';
import { EditionsService } from '../editions/editions.service';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../email/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EditionsModule } from '../editions/editions.module';

@Module({
  imports: [PrismaModule, EditionsModule],
  providers: [LeagueService, LedgerService, EmailService],
  controllers: [LeaguesController, EditionsController, MeController],
  exports: [LeagueService, LedgerService, EmailService],
})
export class LeaguesModule {}
