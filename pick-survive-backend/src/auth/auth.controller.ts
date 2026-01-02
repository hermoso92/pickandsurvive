import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Post('signup')
  async signUp(@Body() dto: SignupDto) {
    try {
      this.logger.log(`Intento de registro: ${dto.email}`);
      const user = await this.authService.signUp(dto.email, dto.password, dto.alias);
      
      // No devolver la contraseña
      delete (user as any).password;
      
      return {
        success: true,
        message: 'Usuario creado exitosamente',
        user,
      };
    } catch (error) {
      this.logger.error(`Error en signup: ${error.message}`, error.stack);
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto.email, dto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req) {
    const userId = req.user.id;
    
    // Obtener usuario con perfil y logo seleccionado
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfile: {
          include: {
            // Incluir el logo seleccionado con su información
            // Nota: Prisma no permite include directo desde UserProfile a ShopItem
            // así que lo haremos manualmente
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener el logo seleccionado si existe
    let selectedLogo: { id: string; code: string; name: string; imageUrl: string | null } | null = null;
    if (user.userProfile?.selectedLogo) {
      const logoItem = await this.prisma.shopItem.findUnique({
        where: { id: user.userProfile.selectedLogo },
        select: {
          id: true,
          code: true,
          name: true,
          imageUrl: true,
        },
      });
      selectedLogo = logoItem;
    }

    // No devolver la contraseña
    const { password, ...userWithoutPassword } = user;
    
    return {
      ...userWithoutPassword,
      selectedLogo,
    };
  }
}