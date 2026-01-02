import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PicksService } from './picks.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePickDto } from './dto/create-pick.dto';

@Controller('editions/:editionId/picks') // Ruta anidada
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Param('editionId') editionId: string,
    @Body() dto: CreatePickDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.picksService.createPick(userId, editionId, dto.teamId, dto.skipDeadline || false);
  }
}