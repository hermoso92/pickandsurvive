import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      throw new Error(
        'EMAIL_USER and EMAIL_PASSWORD environment variables are required. ' +
        'Please set them in your .env file.'
      );
    }
    
    // Configurar transporter para Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    
    this.logger.log('Email service initialized successfully');
  }

  async sendLeagueInvitation(
    toEmail: string,
    leagueName: string,
    inviterName: string,
    leagueId: string
  ): Promise<boolean> {
    try {
      const frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl) {
        throw new Error('FRONTEND_URL environment variable is required');
      }
      const invitationLink = `${frontendUrl}/leagues/${leagueId}/join`;
      
      const mailOptions = {
        from: `"Pick & Survive" <${process.env.EMAIL_USER || 'picksurvive@gmail.com'}>`,
        to: toEmail,
        subject: `🏆 Invitación a la liga "${leagueName}" - Pick & Survive`,
        html: this.generateInvitationEmailHTML(leagueName, inviterName, invitationLink),
        text: this.generateInvitationEmailText(leagueName, inviterName, invitationLink),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Invitación enviada a ${toEmail} para la liga ${leagueName}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando invitación a ${toEmail}:`, error);
      return false;
    }
  }

  private generateInvitationEmailHTML(
    leagueName: string,
    inviterName: string,
    invitationLink: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación a Liga - Pick & Survive</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏆 Pick & Survive</h1>
                <h2>¡Has sido invitado a una liga!</h2>
            </div>
            <div class="content">
                <h3>¡Hola!</h3>
                <p><strong>${inviterName}</strong> te ha invitado a unirte a la liga <strong>"${leagueName}"</strong> en Pick & Survive.</p>
                
                <p>Pick & Survive es una plataforma donde puedes:</p>
                <ul>
                    <li>🎯 Hacer predicciones de partidos de fútbol</li>
                    <li>🏆 Competir con amigos en ligas privadas</li>
                    <li>📊 Seguir estadísticas y rankings</li>
                    <li>🎮 Disfrutar de la emoción del fútbol</li>
                </ul>
                
                <p>Para unirte a la liga, simplemente haz clic en el botón de abajo:</p>
                
                <div style="text-align: center;">
                    <a href="${invitationLink}" class="button">🚀 Unirme a la Liga</a>
                </div>
                
                <p><strong>¿No tienes cuenta?</strong> No te preocupes, puedes registrarte fácilmente cuando hagas clic en el enlace.</p>
                
                <p>¡Esperamos verte pronto en Pick & Survive!</p>
                
                <p>Saludos,<br>El equipo de Pick & Survive</p>
            </div>
            <div class="footer">
                <p>Este email fue enviado desde Pick & Survive. Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateInvitationEmailText(
    leagueName: string,
    inviterName: string,
    invitationLink: string
  ): string {
    return `
🏆 Pick & Survive - Invitación a Liga

¡Hola!

${inviterName} te ha invitado a unirte a la liga "${leagueName}" en Pick & Survive.

Pick & Survive es una plataforma donde puedes:
- Hacer predicciones de partidos de fútbol
- Competir con amigos en ligas privadas
- Seguir estadísticas y rankings
- Disfrutar de la emoción del fútbol

Para unirte a la liga, visita este enlace:
${invitationLink}

¿No tienes cuenta? No te preocupes, puedes registrarte fácilmente cuando visites el enlace.

¡Esperamos verte pronto en Pick & Survive!

Saludos,
El equipo de Pick & Survive

---
Este email fue enviado desde Pick & Survive. Si no esperabas esta invitación, puedes ignorar este mensaje.
    `;
  }

  async sendWelcomeEmail(toEmail: string, userName: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Pick & Survive" <${process.env.EMAIL_USER || 'picksurvive@gmail.com'}>`,
        to: toEmail,
        subject: '🎉 ¡Bienvenido a Pick & Survive!',
        html: this.generateWelcomeEmailHTML(userName),
        text: this.generateWelcomeEmailText(userName),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de bienvenida enviado a ${toEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email de bienvenida a ${toEmail}:`, error);
      return false;
    }
  }

  private generateWelcomeEmailHTML(userName: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido - Pick & Survive</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Pick & Survive</h1>
                <h2>¡Bienvenido!</h2>
            </div>
            <div class="content">
                <h3>¡Hola ${userName}!</h3>
                <p>¡Bienvenido a Pick & Survive! Estamos emocionados de tenerte en nuestra comunidad.</p>
                
                <p>Con tu cuenta puedes:</p>
                <ul>
                    <li>🏆 Crear o unirte a ligas</li>
                    <li>🎯 Hacer predicciones de partidos</li>
                    <li>📊 Ver estadísticas detalladas</li>
                    <li>👥 Invitar amigos a tus ligas</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/dashboard" class="button">🚀 Ir al Dashboard</a>
                </div>
                
                <p>¡Que disfrutes mucho de Pick & Survive!</p>
                
                <p>Saludos,<br>El equipo de Pick & Survive</p>
            </div>
            <div class="footer">
                <p>Este email fue enviado desde Pick & Survive.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateWelcomeEmailText(userName: string): string {
    return `
🎉 Pick & Survive - ¡Bienvenido!

¡Hola ${userName}!

¡Bienvenido a Pick & Survive! Estamos emocionados de tenerte en nuestra comunidad.

Con tu cuenta puedes:
- Crear o unirte a ligas
- Hacer predicciones de partidos
- Ver estadísticas detalladas
- Invitar amigos a tus ligas

Visita tu dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5174'}/dashboard

¡Que disfrutes mucho de Pick & Survive!

Saludos,
El equipo de Pick & Survive

---
Este email fue enviado desde Pick & Survive.
    `;
  }
}
