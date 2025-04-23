import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import EmailModel from "../models/EmailModel";
import UserModel from "../models/UserModel";
import nodemailer from "nodemailer";
import { AddressObject } from "mailparser";

const activeConnections = new Map<string, any>();

/**
 * Valida las configuraciones de IMAP y SMTP proporcionadas.
 */
export const validateEmailSettings = async ({
  emailAddress,
  imapSettings,
  smtpSettings,
}: {
  emailAddress: string;
  imapSettings: any;
  smtpSettings: any;
}): Promise<{ imap: any; smtp: any }> => {
  try {
    // Validar conexión IMAP
    const imapValidation = await imaps
      .connect({
        imap: {
          ...imapSettings,
          tls: imapSettings.tls ?? true,
          authTimeout: 10000,
        },
      })
      .then(async (connection) => {
        await connection.openBox("INBOX");
        await connection.end();
        return { status: "success", message: "IMAP connection successful." };
      })
      .catch((error) => ({
        status: "error",
        message: error.message.includes("timeout")
          ? "IMAP connection timed out."
          : "IMAP authentication failed.",
      }));

    // Validar conexión SMTP
    const smtpValidation = await new Promise((resolve) => {
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        auth: { user: smtpSettings.user, pass: smtpSettings.password },
        connectionTimeout: 10000,
      });

      transporter
        .sendMail({
          from: smtpSettings.user,
          to: emailAddress,
          subject: "SMTP Test",
          text: "Testing SMTP configuration.",
        })
        .then(() =>
          resolve({ status: "success", message: "SMTP connection successful." })
        )
        .catch((error) =>
          resolve({
            status: "error",
            message: error.message.includes("Connection timed out")
              ? "SMTP connection timed out."
              : "SMTP authentication failed.",
          })
        );
    });

    return { imap: imapValidation, smtp: smtpValidation };
  } catch (error) {
    console.error("Error validating email settings:", error);
    throw new Error("Validation failed. Please check the email settings.");
  }
};

/**
 * Valida las configuraciones de IMAP y SMTP almacenadas para un usuario.
 */
export const validateUserEmailSettings = async (userId: string) => {
  try {
    const user = await UserModel.findById(userId).select("emailSettings");
    if (!user || !user.emailSettings) {
      throw new Error("Email settings not found for user.");
    }

    const { imapSettings, smtpSettings, emailAddress } = user.emailSettings;
    if (!imapSettings || !smtpSettings || !emailAddress) {
      throw new Error(
        "Incomplete email settings. IMAP, SMTP, and emailAddress are required."
      );
    }

    return validateEmailSettings({ emailAddress, imapSettings, smtpSettings });
  } catch (error) {
    console.error("Error validating user email settings:", error);
    throw new Error(
      "Validation failed. Please check the stored email settings."
    );
  }
};

/**
 * Escucha nuevos correos para usuarios con configuraciones válidas.
 */
export const listenForNewEmails = async () => {
  try {
    const users = await UserModel.find({
      "emailSettings.imapSettings": { $exists: true },
    });

    for (const user of users) {
      const { _id: userId, emailSettings } = user;

      if (activeConnections.has(userId.toString())) {
        console.log(`Connection already exists for user: ${userId}`);
        continue;
      }

      const connection = await imaps.connect({
        imap: { ...emailSettings.imapSettings, authTimeout: 10000 },
      });

      await connection.openBox("INBOX");

      connection.on("mail", async (numNewMessages: number) => {
        const results = await connection.search(["UNSEEN"], {
          bodies: [""],
          struct: true,
        });
        for (const result of results) {
          await processEmailResult(result, userId.toString());
        }
      });

      connection.on("error", (err) => {
        console.error(`IMAP connection error (user: ${userId}):`, err);
        activeConnections.delete(userId.toString());
      });

      connection.on("close", () => {
        console.warn(`IMAP connection closed (user: ${userId}).`);
        activeConnections.delete(userId.toString());
      });

      activeConnections.set(userId.toString(), connection);
    }
  } catch (error) {
    console.error("Error setting up email listeners:", error);
  }
};

/**
 * Procesa y guarda el resultado de un correo en la base de datos.
 */
const processEmailResult = async (result: any, userId: string) => {
  try {
    // Extraer el cuerpo completo del correo
    const rawEmail = result.parts?.find((part: any) => part.which === "")?.body;
    if (!rawEmail) {
      console.warn("No raw email part found.", { result });
      return null;
    }

    // Parsear el correo con simpleParser
    const parsedMail = await simpleParser(rawEmail);

    // Validar campos esenciales
    const { uid } = result.attributes || {};
    if (!parsedMail.from || !parsedMail.to || !parsedMail.subject || !uid) {
      console.error("Missing essential fields in email:", { parsedMail });
      return null;
    }

    // Verificar si el correo ya existe en la base de datos
    const existingEmail = await EmailModel.findOne({ uid, userId });
    if (existingEmail) {
      console.log(`Email with UID ${uid} already exists. Skipping.`);
      return null;
    }

    // Procesar adjuntos: guardar solo los metadatos
    const attachments = parsedMail.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size, // Tamaño en bytes
      partID: attachment.cid || attachment.contentId || "", // Identificador único de la parte
    }));

    // Crear objeto de correo para guardar en la base de datos
    const email = {
      date: parsedMail.date,
      from: parsedMail.from.text,
      to: Array.isArray(parsedMail.to)
        ? parsedMail.to.map((addr) => addr.text)
        : [parsedMail.to.text],
      subject: parsedMail.subject || "",
      userId,
      html: parsedMail.html || "",
      text: parsedMail.text || "",
      uid,
      attachments, // Incluir metadatos de los adjuntos
    };

    // Guardar el correo en la base de datos
    await EmailModel.create(email);
    console.log(`Email saved successfully: ${parsedMail.subject}`);
    return email;
  } catch (error) {
    console.error("Error processing email:", error);
    return null;
  }
};

/**
 * Cierra todas las conexiones activas al apagar el servidor.
 */
export const closeAllConnections = async () => {
  for (const [userId, connection] of activeConnections.entries()) {
    try {
      await connection.end();
      activeConnections.delete(userId);
    } catch (error) {
      console.error(`Error closing connection for user: ${userId}`, error);
    }
  }
};

/**
 * Sincroniza correos antiguos desde el servidor IMAP.
 */
export const syncOldEmails = async (userId: string) => {
  try {
    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );
    if (!user?.emailSettings?.imapSettings) {
      throw new Error("IMAP settings not found for user.");
    }

    const connection = await imaps.connect({
      imap: { ...user.emailSettings.imapSettings, authTimeout: 10000 },
    });

    await connection.openBox("INBOX");

    const results = await connection.search(
      [["BEFORE", new Date().toUTCString().slice(0, 16)]],
      { bodies: [""], struct: true }
    );

    const processedEmails = await Promise.all(
      results.map((result) => processEmailResult(result, userId))
    );

    await connection.end();
    return processedEmails.filter((email) => email !== null);
  } catch (error) {
    console.error("Error syncing old emails:", error);
    throw error;
  }
};

/**
 * Elimina un correo electrónico del servidor IMAP.
 * @param userId ID del usuario propietario del correo.
 * @param uid UID del correo a eliminar.
 * @returns Mensaje de confirmación.
 */
export const deleteEmailFromServer = async (
  userId: string,
  uid: number
): Promise<string> => {
  try {
    // Obtener configuraciones del usuario
    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      throw new Error("IMAP settings not found for user.");
    }

    // Conectar al servidor IMAP
    const connection = await imaps.connect({
      imap: { ...user.emailSettings.imapSettings, authTimeout: 10000 },
    });

    await connection.openBox("INBOX");

    // Eliminar el correo
    await connection.deleteMessage(uid);
    await connection.end();

    return `Email with UID ${uid} deleted successfully from IMAP server.`;
  } catch (error) {
    console.error("Error deleting email from server:", error);
    throw new Error("Failed to delete email from server.");
  }
};
