import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AddCreditsDto } from './dto/add-credits.dto';
import { MasterUserGuard } from '../auth/master-user.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), MasterUserGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    // No permitir eliminar al usuario maestro
    const user = await this.adminService.getUserById(userId);
    if (user && user.email === 'master@pickandsurvive.com') {
      throw new BadRequestException('Cannot delete master user');
    }

    return this.adminService.deleteUser(userId);
  }

  @Post('users/:userId/credits')
  async addCredits(
    @Param('userId') userId: string,
    @Body() dto: AddCreditsDto
  ) {
    return this.adminService.addCreditsToUser(
      userId,
      dto.amountCents,
      dto.reason || 'Admin credit assignment'
    );
  }
}
