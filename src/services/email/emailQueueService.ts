import Bull from "bull";
import { defaultEmailConfig } from "../../config/emailConfig";
import EmailModel from "../../models/EmailModel";
import { simpleParser } from "mailparser";
import mongoose from "mongoose";

/**
 * Servicio mejorado para el manejo de colas de correos electrónicos
 */
export class EmailQueueService {
  private static instance: EmailQueueService;
  private emailProcessingQueue: Bull.Queue;
  private emailSendingQueue: Bull.Queue;

  private constructor() {
    // Configurar cola de procesamiento de correos entrantes
    this.emailProcessingQueue = new Bull("email-processing", {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: defaultEmailConfig.processing.retryAttempts,
        backoff: {
          type: "exponential",
          delay: defaultEmailConfig.processing.retryDelay,
        },
      },
    });

    // Configurar cola de envío de correos
    this.emailSendingQueue = new Bull("email-sending", {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  static getInstance(): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService();
    }
    return EmailQueueService.instance;
  }

  /**
   * Configura los procesadores de las colas
   */
  private setupProcessors(): void {
    // Procesador para correos entrantes
    this.emailProcessingQueue.process(
      "process-incoming-emails",
      defaultEmailConfig.processing.maxConcurrentProcessing,
      this.processIncomingEmails.bind(this)
    );

    // Procesador para envío de correos
    this.emailSendingQueue.process(
      "send-email",
      defaultEmailConfig.smtp.maxConnections,
      this.processSendEmail.bind(this)
    );

    // Procesador para operaciones masivas
    this.emailProcessingQueue.process(
      "bulk-operation",
      5,
      this.processBulkOperation.bind(this)
    );
  }

  /**
   * Configura los manejadores de eventos
   */
  private setupEventHandlers(): void {
    this.emailProcessingQueue.on("completed", (job, result) => {
      console.log(`Email processing job ${job.id} completed:`, result);
    });

    this.emailProcessingQueue.on("failed", (job, err) => {
      console.error(`Email processing job ${job.id} failed:`, err);
    });

    this.emailSendingQueue.on("completed", (job, result) => {
      console.log(`Email sending job ${job.id} completed:`, result);
    });

    this.emailSendingQueue.on("failed", (job, err) => {
      console.error(`Email sending job ${job.id} failed:`, err);
    });
  }

  /**
   * Procesa correos entrantes en lotes
   */
  private async processIncomingEmails(job: Bull.Job): Promise<any> {
    const { emails, userId } = job.data;
    const processedEmails: any[] = [];
    const errors: any[] = [];

    console.log(`Processing ${emails.length} emails for user ${userId}`);

    // Procesar en lotes para evitar sobrecarga
    const batchSize = defaultEmailConfig.processing.batchSize;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((emailData: any) => this.processEmailData(emailData, userId))
      );

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          processedEmails.push(result.value);
        } else {
          errors.push({
            index: i + index,
            error: result.reason,
          });
        }
      });

      // Pequeña pausa entre lotes para no sobrecargar la base de datos
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      processed: processedEmails.length,
      errors: errors.length,
      details: { processedEmails, errors },
    };
  }

  /**
   * Procesa un correo individual
   */
  private async processEmailData(emailData: any, userId: string): Promise<any> {
    try {
      // Verificar si el correo ya existe
      const existingEmail = await EmailModel.findOne({
        uid: emailData.uid,
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (existingEmail) {
        console.log(
          `Email with UID ${emailData.uid} already exists. Skipping.`
        );
        return null;
      }

      // Parsear el correo
      const parsedMail = await simpleParser(emailData.rawEmail);

      // Validar campos esenciales
      if (!parsedMail.from || !parsedMail.to || !parsedMail.subject) {
        throw new Error("Missing essential email fields");
      }

      // Procesar adjuntos (solo metadatos)
      const attachments =
        parsedMail.attachments?.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          partID: attachment.cid || attachment.contentId || "",
        })) || [];

      // Crear objeto de correo
      const emailObject = {
        date: parsedMail.date || new Date(),
        from: parsedMail.from.text,
        to: Array.isArray(parsedMail.to)
          ? parsedMail.to.map((addr: any) => addr.text)
          : [parsedMail.to.text],
        subject: parsedMail.subject,
        userId: new mongoose.Types.ObjectId(userId),
        html: parsedMail.html || "",
        text: parsedMail.text || "",
        uid: emailData.uid,
        attachments,
        isRead: false,
        folder: "INBOX",
      };

      // Guardar en la base de datos
      const savedEmail = await EmailModel.create(emailObject);
      console.log(`Email saved successfully: ${parsedMail.subject}`);

      return savedEmail;
    } catch (error) {
      console.error("Error processing email:", error);
      throw error;
    }
  }

  /**
   * Procesa el envío de un correo
   */
  private async processSendEmail(job: Bull.Job): Promise<any> {
    const { smtpSettings, emailData, userId } = job.data;

    try {
      const { sendEmailViaSMTP } = await import("../../utils/smtpClient");
      const result = await sendEmailViaSMTP(smtpSettings, emailData);

      console.log(`Email sent successfully for user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Failed to send email for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa operaciones masivas
   */
  private async processBulkOperation(job: Bull.Job): Promise<any> {
    const { operation, emailIds, userId, additionalData } = job.data;

    try {
      let result;

      switch (operation) {
        case "markAsRead":
          result = await EmailModel.updateMany(
            { _id: { $in: emailIds }, userId },
            { $set: { isRead: true } }
          );
          break;

        case "markAsUnread":
          result = await EmailModel.updateMany(
            { _id: { $in: emailIds }, userId },
            { $set: { isRead: false } }
          );
          break;

        case "delete":
          result = await EmailModel.deleteMany({
            _id: { $in: emailIds },
            userId,
          });
          break;

        case "moveToFolder":
          result = await EmailModel.updateMany(
            { _id: { $in: emailIds }, userId },
            { $set: { folder: additionalData.folder } }
          );
          break;

        default:
          throw new Error(`Unknown bulk operation: ${operation}`);
      }

      console.log(`Bulk operation ${operation} completed for user ${userId}`);
      return result;
    } catch (error) {
      console.error(
        `Bulk operation ${operation} failed for user ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Añade correos a la cola de procesamiento
   */
  async addEmailsToProcessingQueue(
    emails: any[],
    userId: string
  ): Promise<Bull.Job> {
    return this.emailProcessingQueue.add(
      "process-incoming-emails",
      { emails, userId },
      {
        priority: 1,
        delay: 0,
      }
    );
  }

  /**
   * Añade un correo a la cola de envío
   */
  async addEmailToSendingQueue(
    smtpSettings: any,
    emailData: any,
    userId: string
  ): Promise<Bull.Job> {
    return this.emailSendingQueue.add(
      "send-email",
      { smtpSettings, emailData, userId },
      {
        priority: 2,
        delay: 0,
      }
    );
  }

  /**
   * Añade una operación masiva a la cola
   */
  async addBulkOperationToQueue(
    operation: string,
    emailIds: string[],
    userId: string,
    additionalData?: any
  ): Promise<Bull.Job> {
    return this.emailProcessingQueue.add(
      "bulk-operation",
      { operation, emailIds, userId, additionalData },
      {
        priority: 3,
        delay: 0,
      }
    );
  }

  /**
   * Obtiene estadísticas de las colas
   */
  async getQueueStats(): Promise<any> {
    const processingStats = await this.emailProcessingQueue.getJobCounts();
    const sendingStats = await this.emailSendingQueue.getJobCounts();

    return {
      processing: processingStats,
      sending: sendingStats,
    };
  }

  /**
   * Limpia las colas
   */
  async cleanQueues(): Promise<void> {
    await this.emailProcessingQueue.clean(24 * 60 * 60 * 1000, "completed");
    await this.emailProcessingQueue.clean(24 * 60 * 60 * 1000, "failed");
    await this.emailSendingQueue.clean(24 * 60 * 60 * 1000, "completed");
    await this.emailSendingQueue.clean(24 * 60 * 60 * 1000, "failed");
  }

  /**
   * Cierra las colas
   */
  async close(): Promise<void> {
    await this.emailProcessingQueue.close();
    await this.emailSendingQueue.close();
  }
}

export default EmailQueueService;
