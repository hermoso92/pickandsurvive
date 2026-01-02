import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinsService } from '../coins/coins.service';

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coinsService: CoinsService,
  ) {}

  /**
   * Obtiene todos los items disponibles en la tienda
   */
  async getAvailableItems() {
    return this.prisma.shopItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { pricePoints: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtiene un item específico
   */
  async getItemById(itemId: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${itemId} no encontrado`);
    }

    return item;
  }

  /**
   * Compra un item de la tienda
   */
  async purchaseItem(userId: string, itemId: string): Promise<void> {
    // Verificar que el item existe y está activo
    const item = await this.getItemById(itemId);
    
    if (!item.isActive) {
      throw new BadRequestException('Este item no está disponible');
    }

    // Verificar si el usuario ya lo tiene
    const existingPurchase = await this.prisma.userPurchase.findUnique({
      where: {
        userId_shopItemId: {
          userId,
          shopItemId: itemId,
        },
      },
    });

    if (existingPurchase) {
      throw new BadRequestException('Ya has comprado este item');
    }

    // Verificar que el usuario tiene suficientes monedas
    const userCoins = await this.coinsService.getUserCoins(userId);
    
    if (userCoins < item.pricePoints) {
      throw new BadRequestException(
        `Monedas insuficientes. Necesitas ${item.pricePoints} monedas pero tienes ${userCoins}`
      );
    }

    // Realizar la compra en transacción
    await this.prisma.$transaction(async (tx) => {
      // Crear la compra
      await tx.userPurchase.create({
        data: {
          userId,
          shopItemId: itemId,
        },
      });

      // Descontar monedas
      await this.coinsService.createCoinTransaction({
        userId,
        coins: -item.pricePoints, // Negativo porque es un gasto
        type: 'SHOP_PURCHASE',
        metaJson: {
          shopItemId: itemId,
          shopItemCode: item.code,
          shopItemName: item.name,
        },
      });

      this.logger.log(`🛒 Usuario ${userId} compró item ${item.name} por ${item.pricePoints} monedas`);
    });
  }

  /**
   * Obtiene los items comprados por un usuario
   */
  async getUserPurchases(userId: string) {
    const purchases = await this.prisma.userPurchase.findMany({
      where: { userId },
      include: {
        shopItem: true,
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    return purchases.map(p => ({
      ...p.shopItem,
      purchasedAt: p.purchasedAt,
    }));
  }

  /**
   * Verifica si un usuario tiene un item específico
   */
  async userHasItem(userId: string, itemId: string): Promise<boolean> {
    const purchase = await this.prisma.userPurchase.findUnique({
      where: {
        userId_shopItemId: {
          userId,
          shopItemId: itemId,
        },
      },
    });

    return !!purchase;
  }

  /**
   * Selecciona un logo para el usuario
   */
  async selectLogo(userId: string, itemId: string): Promise<void> {
    // Verificar que el item existe y es de tipo LOGO
    const item = await this.getItemById(itemId);
    
    if (item.type !== 'LOGO') {
      throw new BadRequestException('Este item no es un logo');
    }

    // Verificar que el usuario tiene el item
    const hasItem = await this.userHasItem(userId, itemId);
    if (!hasItem) {
      throw new BadRequestException('No has comprado este logo');
    }

    // Crear o actualizar el perfil del usuario con el logo seleccionado
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { selectedLogo: itemId },
      create: {
        userId,
        selectedLogo: itemId,
      },
    });

    this.logger.log(`✅ Usuario ${userId} seleccionó logo ${item.name}`);
  }

  /**
   * Obtiene el logo seleccionado del usuario
   */
  async getSelectedLogo(userId: string): Promise<string | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { selectedLogo: true },
    });

    return profile?.selectedLogo || null;
  }
}

