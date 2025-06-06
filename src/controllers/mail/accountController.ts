import { Request, Response } from "express";
import UserModel from "../../models/UserModel";
import {
  validateEmailSettings,
  syncOldEmails,
  validateUserEmailSettings,
} from "../../utils/imapClient";

/**
 * Configura la cuenta IMAP/SMTP para el usuario autenticado.
 */
export const configureAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { emailAddress, imapSettings, smtpSettings } = req.body;

    if (!emailAddress || !imapSettings || !smtpSettings) {
      return res.status(400).json({
        error: "Email address, IMAP, and SMTP settings are required.",
      });
    }

    // Validar configuraciones antes de guardar
    const validationResults = await validateEmailSettings({
      emailAddress,
      imapSettings,
      smtpSettings,
    });

    if (
      validationResults.imap.status === "error" ||
      validationResults.smtp.status === "error"
    ) {
      return res.status(400).json({
        message: "Validation failed.",
        validationResults,
      });
    }

    // Guardar configuraciones en la base de datos
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        emailSettings: {
          emailAddress,
          imapSettings,
          smtpSettings,
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Sincronizar correos antiguos
    const syncedEmails = await syncOldEmails(userId);

    res.status(200).json({
      message: "Account configured and emails synchronized successfully.",
      validationResults,
      syncedEmailsCount: syncedEmails.length,
    });
  } catch (error: any) {
    console.error("Error configuring account:", error.message || error);
    res.status(500).json({ error: "Failed to configure account." });
  }
};

/**
 * Valida la configuración IMAP/SMTP proporcionada.
 */
/**
 * Valida las configuraciones IMAP y SMTP del usuario.
 */
export const validateAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Llamar a la función de validación centralizada
    const validationResults = await validateUserEmailSettings(userId);

    res.status(200).json({
      message: "Validation completed.",
      ...validationResults,
    });
  } catch (error: any) {
    console.error("Error validating account:", error.message || error);
    res.status(500).json({ error: "Failed to validate account settings." });
  }
};

/**
 * Obtiene la configuración de email del usuario autenticado.
 */
export const getAccountSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await UserModel.findById(userId).select("emailSettings");

    if (!user || !user.emailSettings) {
      return res.status(404).json({
        message: "No email settings found for this user.",
        emailSettings: null,
      });
    }

    // Retornar configuraciones sin las contraseñas por seguridad
    const safeSettings = {
      emailAddress: user.emailSettings.emailAddress,
      imapSettings: {
        host: user.emailSettings.imapSettings.host,
        port: user.emailSettings.imapSettings.port,
        user: user.emailSettings.imapSettings.user,
        tls: user.emailSettings.imapSettings.tls,
        lastUID: user.emailSettings.imapSettings.lastUID,
        // password omitida por seguridad
      },
      smtpSettings: {
        host: user.emailSettings.smtpSettings.host,
        port: user.emailSettings.smtpSettings.port,
        user: user.emailSettings.smtpSettings.user,
        secure: user.emailSettings.smtpSettings.secure,
        // password omitida por seguridad
      },
    };

    res.status(200).json(safeSettings);
  } catch (error: any) {
    console.error("Error getting account settings:", error.message || error);
    res.status(500).json({ error: "Failed to get account settings." });
  }
};
