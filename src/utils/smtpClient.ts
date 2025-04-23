import nodemailer from "nodemailer";

/**
 * Envía un correo electrónico utilizando configuración SMTP.
 * @param smtpSettings Configuración SMTP del usuario.
 * @param emailData Datos del correo (destinatario, asunto, cuerpo, adjuntos).
 * @returns Información sobre el correo enviado.
 */
export const sendEmailViaSMTP = async (
  smtpSettings: {
    host: string;
    port: number;
    secure?: boolean; // Opcional: se determinará automáticamente
    user: string;
    password: string;
  },
  emailData: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: {
      filename?: string;
      path?: string;
      content?: string | Buffer;
      contentType?: string;
      cid?: string;
    }[];
  }
): Promise<any> => {
  try {
    const { host, port, user, password } = smtpSettings;

    if (!host || !port || !user || !password) {
      throw new Error("Incomplete SMTP settings provided.");
    }

    // Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // Detectar automáticamente si es seguro
      auth: { user, pass: password },
      connectionTimeout: 5000,
      socketTimeout: 5000,
    });

    const { to, subject, text, html, attachments } = emailData;

    // Validar campos esenciales
    if (!to || !subject || (!text && !html)) {
      throw new Error(
        "Recipient, subject, and either text or HTML body are required."
      );
    }

    // Validar adjuntos
    if (attachments && !Array.isArray(attachments)) {
      throw new Error("Attachments must be an array.");
    }

    // Opciones del correo
    const mailOptions = {
      from: user,
      to,
      subject,
      text,
      html,
      attachments,
    };

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    return info; // Información del correo enviado
  } catch (error: any) {
    throw new Error(
      `Failed to send email: ${error.response || error.message || "Unknown error"}`
    );
  }
};
