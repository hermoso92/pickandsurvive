import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, ParseIntPipe } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCoinTransactionDto } from './dto/create-coin-transaction.dto';

@Controller('coins')
@UseGuards(JwtAuthGuard)
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  @Get('me')
  async getMyCoins(@Req() req) {
    const userId = req.user.id;
    const totalCoins = await this.coinsService.getUserCoins(userId);
    const stats = await this.coinsService.getUserCoinsStats(userId);
    
    return {
      totalCoins,
      stats,
    };
  }

  @Get('history')
  async getMyHistory(
    @Req() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const userId = req.user.id;
    return this.coinsService.getUserCoinHistory(userId, limit || 50, offset || 0);
  }

  @Get('edition/:editionId')
  async getEditionCoins(@Req() req, @Param('editionId') editionId: string) {
    const userId = req.user.id;
    const coins = await this.coinsService.calculateCoinsForEdition(userId, editionId);
    return { coins, editionId };
  }

  @Post('transaction')
  async createTransaction(@Req() req, @Body() dto: CreateCoinTransactionDto) {
    // Solo permitir que el usuario cree transacciones para sí mismo
    if (dto.userId !== req.user.id) {
      throw new Error('No puedes crear transacciones para otros usuarios');
    }
    
    await this.coinsService.createCoinTransaction(dto);
    return { success: true };
  }
}

