import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EmailService } from './email.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * POST /email/test-invitation
   * Endpoint de prueba para enviar correos de invitación
   * Solo para administradores
   */
  @Post('test-invitation')
  @UseGuards(AuthGuard('jwt'))
  async testInvitation(
    @Body() body: { 
      toEmail: string; 
      leagueName: string; 
      leagueId: string; 
    },
    @Req() req: any
  ) {
    // Verificar que el usuario es administrador
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden probar el envío de correos');
    }

    const result = await this.emailService.sendLeagueInvitation(
      body.toEmail,
      body.leagueName,
      'Administrador',
      body.leagueId
    );

    return {
      success: result,
      message: result 
        ? 'Correo de invitación enviado correctamente' 
        : 'Error enviando correo de invitación'
    };
  }

  /**
   * POST /email/test-welcome
   * Endpoint de prueba para enviar correos de bienvenida
   * Solo para administradores
   */
  @Post('test-welcome')
  @UseGuards(AuthGuard('jwt'))
  async testWelcome(
    @Body() body: { toEmail: string; userName: string },
    @Req() req: any
  ) {
    // Verificar que el usuario es administrador
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden probar el envío de correos');
    }

    const result = await this.emailService.sendWelcomeEmail(
      body.toEmail,
      body.userName
    );

    return {
      success: result,
      message: result 
        ? 'Correo de bienvenida enviado correctamente' 
        : 'Error enviando correo de bienvenida'
    };
  }
}
