import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import EmailModel from "../models/EmailModel";
import UserModel from "../models/UserModel";
import nodemailer from "nodemailer";
import { AddressObject } from "mailparser";
import { emitToUser } from "../config/socket";

// Interfaz para gestión de conexiones mejorada
interface ConnectionManager {
  connection: any;
  lastActivity: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
}

const activeConnections = new Map<string, ConnectionManager>();
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 30000; // 30 segundos
const HEALTH_CHECK_INTERVAL = 60000; // 1 minuto

/**
 * Gestión mejorada de conexiones IMAP con reconexión automática
 */
class IMAPConnectionManager {
  private static instance: IMAPConnectionManager;
  private healthCheckTimer?: NodeJS.Timeout;

  static getInstance(): IMAPConnectionManager {
    if (!IMAPConnectionManager.instance) {
      IMAPConnectionManager.instance = new IMAPConnectionManager();
    }
    return IMAPConnectionManager.instance;
  }

  /**
   * Inicia el monitoreo de salud de conexiones
   */
  startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkConnectionsHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Verifica la salud de todas las conexiones activas
   */
  private async checkConnectionsHealth(): Promise<void> {
    for (const [userId, manager] of activeConnections.entries()) {
      try {
        // Verificar si la conexión está activa
        if (
          manager.connection &&
          manager.connection.state === "authenticated"
        ) {
          await manager.connection.openBox("INBOX");
          manager.isHealthy = true;
          manager.lastActivity = new Date();
        } else {
          manager.isHealthy = false;
          await this.reconnectUser(userId);
        }
      } catch (error) {
        console.error(`Health check failed for user ${userId}:`, error);
        manager.isHealthy = false;
        await this.reconnectUser(userId);
      }
    }
  }

  /**
   * Reconecta un usuario específico
   */
  private async reconnectUser(userId: string): Promise<void> {
    const manager = activeConnections.get(userId);
    if (!manager || manager.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnection attempts reached for user ${userId}`);
      activeConnections.delete(userId);
      return;
    }

    try {
      manager.reconnectAttempts++;
      console.log(
        `Attempting reconnection ${manager.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} for user ${userId}`
      );

      // Cerrar conexión existente si existe
      if (manager.connection) {
        try {
          await manager.connection.end();
        } catch (error) {
          console.warn(
            `Error closing existing connection for user ${userId}:`,
            error
          );
        }
      }

      // Establecer nueva conexión
      await this.createConnectionForUser(userId);
    } catch (error) {
      console.error(`Reconnection failed for user ${userId}:`, error);
      if (manager.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        activeConnections.delete(userId);
      }
    }
  }

  /**
   * Crea una nueva conexión para un usuario
   */
  public async createConnectionForUser(userId: string): Promise<void> {
    const user = await UserModel.findById(userId).select("emailSettings");
    if (!user?.emailSettings?.imapSettings) {
      throw new Error(`Email settings not found for user ${userId}`);
    }

    // Validar que las configuraciones estén completas
    if (!isEmailConfigurationComplete(user.emailSettings)) {
      throw new Error(`Incomplete email configuration for user ${userId}`);
    }

    const connection = await imaps.connect({
      imap: {
        ...user.emailSettings.imapSettings,
        authTimeout: CONNECTION_TIMEOUT,
        connTimeout: CONNECTION_TIMEOUT,
      },
    });

    await connection.openBox("INBOX");

    // Configurar listeners
    connection.on("mail", async (numNewMessages: number) => {
      try {
        const results = await connection.search(["UNSEEN"], {
          bodies: [""],
          struct: true,
        });
        for (const result of results) {
          await processEmailResult(result, userId);
        }

        // Actualizar actividad
        const manager = activeConnections.get(userId);
        if (manager) {
          manager.lastActivity = new Date();
        }
      } catch (error) {
        console.error(`Error processing new emails for user ${userId}:`, error);
      }
    });

    connection.on("error", (err) => {
      console.error(`IMAP connection error (user: ${userId}):`, err);
      const manager = activeConnections.get(userId);
      if (manager) {
        manager.isHealthy = false;
      }
    });

    connection.on("close", () => {
      console.warn(`IMAP connection closed (user: ${userId}).`);
      const manager = activeConnections.get(userId);
      if (manager) {
        manager.isHealthy = false;
      }
    });

    // Actualizar o crear manager
    const manager = activeConnections.get(userId) || {
      connection: null,
      lastActivity: new Date(),
      reconnectAttempts: 0,
      isHealthy: true,
    };

    manager.connection = connection;
    manager.isHealthy = true;
    manager.reconnectAttempts = 0;
    manager.lastActivity = new Date();

    activeConnections.set(userId, manager);
  }

  /**
   * Detiene el monitoreo de salud
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

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
    // Validar conexión IMAP con timeout
    const imapValidation = await Promise.race([
      imaps
        .connect({
          imap: {
            ...imapSettings,
            tls: imapSettings.tls ?? true,
            authTimeout: 10000,
            connTimeout: 10000,
          },
        })
        .then(async (connection) => {
          await connection.openBox("INBOX");
          await connection.end();
          return { status: "success", message: "IMAP connection successful." };
        }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("IMAP connection timeout")), 15000)
      ),
    ]).catch((error) => ({
      status: "error",
      message: error.message.includes("timeout")
        ? "IMAP connection timed out."
        : "IMAP authentication failed.",
    }));

    // Validar conexión SMTP con timeout
    const smtpValidation = await Promise.race([
      new Promise((resolve) => {
        const transporter = nodemailer.createTransport({
          host: smtpSettings.host,
          port: smtpSettings.port,
          secure: smtpSettings.secure,
          auth: { user: smtpSettings.user, pass: smtpSettings.password },
          connectionTimeout: 10000,
        });

        transporter
          .verify()
          .then(() =>
            resolve({
              status: "success",
              message: "SMTP connection successful.",
            })
          )
          .catch((error: any) =>
            resolve({
              status: "error",
              message: error.message.includes("timeout")
                ? "SMTP connection timed out."
                : "SMTP authentication failed.",
            })
          );
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP validation timeout")), 15000)
      ),
    ]).catch(() => ({
      status: "error",
      message: "SMTP validation timed out.",
    }));

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
 * Valida si las configuraciones de email están completas y no son strings vacíos
 */
const isEmailConfigurationComplete = (emailSettings: any): boolean => {
  if (!emailSettings) return false;

  const { emailAddress, imapSettings, smtpSettings } = emailSettings;

  // Validar que emailAddress no esté vacío
  if (!emailAddress || emailAddress.trim() === "") return false;

  // Validar configuraciones IMAP
  if (!imapSettings) return false;
  if (!imapSettings.host || imapSettings.host.trim() === "") return false;
  if (!imapSettings.user || imapSettings.user.trim() === "") return false;
  if (!imapSettings.password || imapSettings.password.trim() === "")
    return false;
  if (!imapSettings.port || imapSettings.port <= 0) return false;

  // Validar configuraciones SMTP
  if (!smtpSettings) return false;
  if (!smtpSettings.host || smtpSettings.host.trim() === "") return false;
  if (!smtpSettings.user || smtpSettings.user.trim() === "") return false;
  if (!smtpSettings.password || smtpSettings.password.trim() === "")
    return false;
  if (!smtpSettings.port || smtpSettings.port <= 0) return false;

  return true;
};

/**
 * Escucha nuevos correos para usuarios con configuraciones válidas.
 */
export const listenForNewEmails = async () => {
  try {
    const connectionManager = IMAPConnectionManager.getInstance();
    connectionManager.startHealthCheck();

    // Buscar usuarios que tengan configuraciones de email
    const users = await UserModel.find({
      "emailSettings.imapSettings": { $exists: true },
    }).select("emailSettings");

    console.log(
      `📧 Evaluando ${users.length} usuarios para conexiones IMAP...`
    );

    let validUsers = 0;
    let invalidUsers = 0;

    for (const user of users) {
      const { _id: userId } = user;

      // Validar que las configuraciones estén completas
      if (!isEmailConfigurationComplete(user.emailSettings)) {
        console.log(
          `⚠️ Usuario ${userId} tiene configuraciones incompletas, omitiendo...`
        );
        invalidUsers++;
        continue;
      }

      if (activeConnections.has(userId.toString())) {
        console.log(`🔄 Conexión ya existe para usuario: ${userId}`);
        continue;
      }

      try {
        await connectionManager.createConnectionForUser(userId.toString());
        validUsers++;
        console.log(`✅ Conexión IMAP establecida para usuario: ${userId}`);
      } catch (error) {
        console.error(
          `❌ Error creando conexión para usuario ${userId}:`,
          error
        );
        invalidUsers++;
      }
    }

    console.log(`📊 Resumen de conexiones IMAP:`);
    console.log(`  ✅ Usuarios conectados: ${validUsers}`);
    console.log(`  ❌ Usuarios omitidos/fallidos: ${invalidUsers}`);
    console.log(`  📧 Total conexiones activas: ${activeConnections.size}`);
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
      console.warn("⚠️ No raw email part found.", {
        resultKeys: Object.keys(result || {}),
        partsLength: result.parts?.length || 0,
      });
      return null;
    }

    // Parsear el correo con simpleParser
    const parsedMail = await simpleParser(rawEmail);

    // Validar campos esenciales
    const { uid } = result.attributes || {};
    if (!parsedMail.from || !parsedMail.to || !parsedMail.subject || !uid) {
      console.error("❌ Missing essential fields in email:", {
        hasFrom: !!parsedMail.from,
        hasTo: !!parsedMail.to,
        hasSubject: !!parsedMail.subject,
        hasUid: !!uid,
        subject: parsedMail.subject,
        from: parsedMail.from,
        to: parsedMail.to,
      });
      return null;
    }

    // Generar messageId si no existe
    const messageId =
      parsedMail.messageId ||
      parsedMail.headers?.get("message-id") ||
      `${uid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${userId}`;

    // Verificar si el correo ya existe en la base de datos
    const existingEmail = await EmailModel.findOne({
      $or: [
        { uid, userId },
        { messageId, userId },
      ],
    });

    if (existingEmail) {
      return null;
    }

    // Procesar adjuntos: guardar solo los metadatos
    const attachments =
      parsedMail.attachments?.map((attachment, index) => ({
        filename: attachment.filename || `attachment_${index}`,
        contentType: attachment.contentType || "application/octet-stream",
        size: attachment.size || 0,
        partID:
          attachment.cid ||
          attachment.contentId ||
          `${uid}-${Date.now()}-${index}`,
      })) || [];

    // Procesar direcciones de email con mejor manejo de errores
    let fromAddress: string;
    try {
      fromAddress =
        typeof parsedMail.from === "string"
          ? parsedMail.from
          : parsedMail.from?.text ||
            parsedMail.from?.value?.[0]?.address ||
            "unknown@unknown.com";
    } catch (error) {
      console.warn("⚠️ Error processing from address:", error);
      fromAddress = "unknown@unknown.com";
    }

    let toAddresses: string[];
    try {
      toAddresses = Array.isArray(parsedMail.to)
        ? parsedMail.to.map((addr: any) =>
            typeof addr === "string"
              ? addr
              : addr.text || addr.value?.[0]?.address || "unknown@unknown.com"
          )
        : [
            typeof parsedMail.to === "string"
              ? parsedMail.to
              : parsedMail.to?.text ||
                parsedMail.to?.value?.[0]?.address ||
                "unknown@unknown.com",
          ];
    } catch (error) {
      console.warn("⚠️ Error processing to addresses:", error);
      toAddresses = ["unknown@unknown.com"];
    }

    let ccAddresses: string[];
    try {
      ccAddresses = parsedMail.cc
        ? Array.isArray(parsedMail.cc)
          ? parsedMail.cc.map((addr: any) =>
              typeof addr === "string"
                ? addr
                : addr.text || addr.value?.[0]?.address || "unknown@unknown.com"
            )
          : [
              typeof parsedMail.cc === "string"
                ? parsedMail.cc
                : parsedMail.cc?.text ||
                  parsedMail.cc?.value?.[0]?.address ||
                  "unknown@unknown.com",
            ]
        : [];
    } catch (error) {
      console.warn("⚠️ Error processing cc addresses:", error);
      ccAddresses = [];
    }

    let bccAddresses: string[];
    try {
      bccAddresses = parsedMail.bcc
        ? Array.isArray(parsedMail.bcc)
          ? parsedMail.bcc.map((addr: any) =>
              typeof addr === "string"
                ? addr
                : addr.text || addr.value?.[0]?.address || "unknown@unknown.com"
            )
          : [
              typeof parsedMail.bcc === "string"
                ? parsedMail.bcc
                : parsedMail.bcc?.text ||
                  parsedMail.bcc?.value?.[0]?.address ||
                  "unknown@unknown.com",
            ]
        : [];
    } catch (error) {
      console.warn("⚠️ Error processing bcc addresses:", error);
      bccAddresses = [];
    }

    // Crear objeto de correo para guardar en la base de datos
    const email = {
      date: parsedMail.date || new Date(),
      from: fromAddress,
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      subject: parsedMail.subject || "Sin asunto",
      userId,
      html: parsedMail.html || "",
      text: parsedMail.text || "",
      uid,
      messageId,
      attachments,
      folder: "INBOX",
      isRead: false,
      isStarred: false,
      isImportant: false,
      labels: [],
      priority: "normal" as const,
      flags: [],
      hasAttachments: attachments.length > 0,
      isEncrypted: false,
      size: rawEmail.length || 0,
      snippet:
        parsedMail.text?.substring(0, 200) ||
        (parsedMail.html
          ? parsedMail.html.replace(/<[^>]*>/g, "").substring(0, 200)
          : "") ||
        "",
      threadId: parsedMail.inReplyTo || undefined,
      inReplyTo: parsedMail.inReplyTo || undefined,
    };

    // Guardar el correo en la base de datos
    const savedEmail = await EmailModel.create(email);

    // Emitir evento de socket para notificar nuevo correo
    try {
      emitToUser(userId, "newEmail", {
        email: savedEmail,
        message: "Nuevo correo recibido",
      });
    } catch (socketError) {
      console.error(`📡 ❌ Failed to emit socket event:`, socketError);
    }

    return savedEmail;
  } catch (error: any) {
    console.error("❌ Error processing email:", {
      error: error?.message || "Unknown error",
      stack: error?.stack,
      userId,
      uid: result.attributes?.uid,
      resultKeys: Object.keys(result || {}),
    });
    return null;
  }
};

/**
 * Cierra todas las conexiones activas al apagar el servidor.
 */
export const closeAllConnections = async () => {
  const connectionManager = IMAPConnectionManager.getInstance();
  connectionManager.stopHealthCheck();

  for (const [userId, manager] of activeConnections.entries()) {
    try {
      if (manager.connection) {
        await manager.connection.end();
      }
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
