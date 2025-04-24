// services/email/emailService.ts
import { sendEmailWithBrevo } from './brevoEmailService';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from: string;
  organizationId: string;
}

export class EmailService {
  async sendEmail(params: EmailParams): Promise<boolean> {
   
   
    try {
      // Usar el servicio real de Brevo
      await sendEmailWithBrevo({
        ...params,
        api_key: process.env.BREVO_API_KEY || '' // Asegúrate de tener esta variable de entorno
      });
      return true;
    } catch (error) {
      console.error('Error al enviar email:', error);
      // En producción podrías querer manejar este error de otra manera
      return false;
    }
  }
}
