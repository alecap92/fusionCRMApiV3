"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueService = void 0;
const bull_1 = __importDefault(require("bull"));
const emailConfig_1 = require("../../config/emailConfig");
const EmailModel_1 = __importDefault(require("../../models/EmailModel"));
const mailparser_1 = require("mailparser");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Servicio mejorado para el manejo de colas de correos electrónicos
 */
class EmailQueueService {
    constructor() {
        // Configurar cola de procesamiento de correos entrantes
        this.emailProcessingQueue = new bull_1.default("email-processing", {
            redis: {
                host: process.env.REDIS_HOST || "localhost",
                port: parseInt(process.env.REDIS_PORT || "6379"),
            },
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 5,
                attempts: emailConfig_1.defaultEmailConfig.processing.retryAttempts,
                backoff: {
                    type: "exponential",
                    delay: emailConfig_1.defaultEmailConfig.processing.retryDelay,
                },
            },
        });
        // Configurar cola de envío de correos
        this.emailSendingQueue = new bull_1.default("email-sending", {
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
    static getInstance() {
        if (!EmailQueueService.instance) {
            EmailQueueService.instance = new EmailQueueService();
        }
        return EmailQueueService.instance;
    }
    /**
     * Configura los procesadores de las colas
     */
    setupProcessors() {
        // Procesador para correos entrantes
        this.emailProcessingQueue.process("process-incoming-emails", emailConfig_1.defaultEmailConfig.processing.maxConcurrentProcessing, this.processIncomingEmails.bind(this));
        // Procesador para envío de correos
        this.emailSendingQueue.process("send-email", emailConfig_1.defaultEmailConfig.smtp.maxConnections, this.processSendEmail.bind(this));
        // Procesador para operaciones masivas
        this.emailProcessingQueue.process("bulk-operation", 5, this.processBulkOperation.bind(this));
    }
    /**
     * Configura los manejadores de eventos
     */
    setupEventHandlers() {
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
    processIncomingEmails(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { emails, userId } = job.data;
            const processedEmails = [];
            const errors = [];
            console.log(`Processing ${emails.length} emails for user ${userId}`);
            // Procesar en lotes para evitar sobrecarga
            const batchSize = emailConfig_1.defaultEmailConfig.processing.batchSize;
            for (let i = 0; i < emails.length; i += batchSize) {
                const batch = emails.slice(i, i + batchSize);
                const batchResults = yield Promise.allSettled(batch.map((emailData) => this.processEmailData(emailData, userId)));
                batchResults.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        processedEmails.push(result.value);
                    }
                    else {
                        errors.push({
                            index: i + index,
                            error: result.reason,
                        });
                    }
                });
                // Pequeña pausa entre lotes para no sobrecargar la base de datos
                if (i + batchSize < emails.length) {
                    yield new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
            return {
                processed: processedEmails.length,
                errors: errors.length,
                details: { processedEmails, errors },
            };
        });
    }
    /**
     * Procesa un correo individual
     */
    processEmailData(emailData, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Verificar si el correo ya existe
                const existingEmail = yield EmailModel_1.default.findOne({
                    uid: emailData.uid,
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                });
                if (existingEmail) {
                    console.log(`Email with UID ${emailData.uid} already exists. Skipping.`);
                    return null;
                }
                // Parsear el correo
                const parsedMail = yield (0, mailparser_1.simpleParser)(emailData.rawEmail);
                // Validar campos esenciales
                if (!parsedMail.from || !parsedMail.to || !parsedMail.subject) {
                    throw new Error("Missing essential email fields");
                }
                // Procesar adjuntos (solo metadatos)
                const attachments = ((_a = parsedMail.attachments) === null || _a === void 0 ? void 0 : _a.map((attachment) => ({
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    partID: attachment.cid || attachment.contentId || "",
                }))) || [];
                // Crear objeto de correo
                const emailObject = {
                    date: parsedMail.date || new Date(),
                    from: parsedMail.from.text,
                    to: Array.isArray(parsedMail.to)
                        ? parsedMail.to.map((addr) => addr.text)
                        : [parsedMail.to.text],
                    subject: parsedMail.subject,
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                    html: parsedMail.html || "",
                    text: parsedMail.text || "",
                    uid: emailData.uid,
                    attachments,
                    isRead: false,
                    folder: "INBOX",
                };
                // Guardar en la base de datos
                const savedEmail = yield EmailModel_1.default.create(emailObject);
                console.log(`Email saved successfully: ${parsedMail.subject}`);
                return savedEmail;
            }
            catch (error) {
                console.error("Error processing email:", error);
                throw error;
            }
        });
    }
    /**
     * Procesa el envío de un correo
     */
    processSendEmail(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { smtpSettings, emailData, userId } = job.data;
            try {
                const { sendEmailViaSMTP } = yield Promise.resolve().then(() => __importStar(require("../../utils/smtpClient")));
                const result = yield sendEmailViaSMTP(smtpSettings, emailData);
                console.log(`Email sent successfully for user ${userId}`);
                return result;
            }
            catch (error) {
                console.error(`Failed to send email for user ${userId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Procesa operaciones masivas
     */
    processBulkOperation(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { operation, emailIds, userId, additionalData } = job.data;
            try {
                let result;
                switch (operation) {
                    case "markAsRead":
                        result = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { isRead: true } });
                        break;
                    case "markAsUnread":
                        result = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { isRead: false } });
                        break;
                    case "delete":
                        result = yield EmailModel_1.default.deleteMany({
                            _id: { $in: emailIds },
                            userId,
                        });
                        break;
                    case "moveToFolder":
                        result = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { folder: additionalData.folder } });
                        break;
                    default:
                        throw new Error(`Unknown bulk operation: ${operation}`);
                }
                console.log(`Bulk operation ${operation} completed for user ${userId}`);
                return result;
            }
            catch (error) {
                console.error(`Bulk operation ${operation} failed for user ${userId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Añade correos a la cola de procesamiento
     */
    addEmailsToProcessingQueue(emails, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.emailProcessingQueue.add("process-incoming-emails", { emails, userId }, {
                priority: 1,
                delay: 0,
            });
        });
    }
    /**
     * Añade un correo a la cola de envío
     */
    addEmailToSendingQueue(smtpSettings, emailData, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.emailSendingQueue.add("send-email", { smtpSettings, emailData, userId }, {
                priority: 2,
                delay: 0,
            });
        });
    }
    /**
     * Añade una operación masiva a la cola
     */
    addBulkOperationToQueue(operation, emailIds, userId, additionalData) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.emailProcessingQueue.add("bulk-operation", { operation, emailIds, userId, additionalData }, {
                priority: 3,
                delay: 0,
            });
        });
    }
    /**
     * Obtiene estadísticas de las colas
     */
    getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const processingStats = yield this.emailProcessingQueue.getJobCounts();
            const sendingStats = yield this.emailSendingQueue.getJobCounts();
            return {
                processing: processingStats,
                sending: sendingStats,
            };
        });
    }
    /**
     * Limpia las colas
     */
    cleanQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.emailProcessingQueue.clean(24 * 60 * 60 * 1000, "completed");
            yield this.emailProcessingQueue.clean(24 * 60 * 60 * 1000, "failed");
            yield this.emailSendingQueue.clean(24 * 60 * 60 * 1000, "completed");
            yield this.emailSendingQueue.clean(24 * 60 * 60 * 1000, "failed");
        });
    }
    /**
     * Cierra las colas
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.emailProcessingQueue.close();
            yield this.emailSendingQueue.close();
        });
    }
}
exports.EmailQueueService = EmailQueueService;
exports.default = EmailQueueService;
