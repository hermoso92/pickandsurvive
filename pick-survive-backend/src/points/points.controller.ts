import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, ParseIntPipe } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  async getMyPoints(@Req() req) {
    const userId = req.user.id;
    const totalPoints = await this.pointsService.getUserPoints(userId);
    const stats = await this.pointsService.getUserPointsStats(userId);
    
    return {
      totalPoints,
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
    return this.pointsService.getUserPointHistory(userId, limit || 50, offset || 0);
  }

  @Get('edition/:editionId')
  async getEditionPoints(@Req() req, @Param('editionId') editionId: string) {
    const userId = req.user.id;
    const points = await this.pointsService.calculatePointsForEdition(userId, editionId);
    return { points, totalPoints: points, editionId };
  }

  @Post('transaction')
  async createTransaction(@Req() req, @Body() dto: CreatePointTransactionDto) {
    // Solo permitir que el usuario cree transacciones para sí mismo
    if (dto.userId !== req.user.id) {
      throw new Error('No puedes crear transacciones para otros usuarios');
    }
    
    await this.pointsService.createPointTransaction(dto);
    return { success: true };
  }
}

