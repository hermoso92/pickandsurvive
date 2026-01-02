import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PurchaseItemDto } from './dto/purchase-item.dto';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getAvailableItems() {
    return this.shopService.getAvailableItems();
  }

  @Get('my-items')
  async getMyItems(@Req() req) {
    const userId = req.user.id;
    return this.shopService.getUserPurchases(userId);
  }

  @Post('purchase/:itemId')
  async purchaseItem(@Req() req, @Param('itemId') itemId: string) {
    const userId = req.user.id;
    await this.shopService.purchaseItem(userId, itemId);
    return {
      success: true,
      message: 'Item comprado exitosamente',
    };
  }

  @Get('item/:itemId')
  async getItem(@Param('itemId') itemId: string) {
    return this.shopService.getItemById(itemId);
  }

  @Post('select-logo/:itemId')
  async selectLogo(@Req() req, @Param('itemId') itemId: string) {
    const userId = req.user.id;
    await this.shopService.selectLogo(userId, itemId);
    return {
      success: true,
      message: 'Logo seleccionado exitosamente',
    };
  }

  @Get('selected-logo')
  async getSelectedLogo(@Req() req) {
    const userId = req.user.id;
    const selectedLogoId = await this.shopService.getSelectedLogo(userId);
    return {
      selectedLogoId,
    };
  }
}

