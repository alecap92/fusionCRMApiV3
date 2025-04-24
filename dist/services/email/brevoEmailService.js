"use strict";
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
exports.sendEmailWithBrevo = void 0;
const SibApiV3Sdk = require('sib-api-v3-typescript');
const InvoiceConfiguration_1 = __importDefault(require("../../models/InvoiceConfiguration"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const sendEmailWithBrevo = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { to, subject, text, html, from, attachments, organizationId, api_key, templateId } = params;
        // Buscar configuración de la organización
        const organization = yield OrganizationModel_1.default.findById(organizationId);
        if (!organization) {
            throw new Error("Organización no encontrada");
        }
        // Configurar cliente de Brevo
        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        let apiKey = apiInstance.authentications['apiKey'];
        // Verificar si hay configuración de Brevo
        if (!((_b = (_a = organization.settings) === null || _a === void 0 ? void 0 : _a.masiveEmails) === null || _b === void 0 ? void 0 : _b.apiKey)) {
            // Buscar en la configuración de facturación
            const invoiceConfig = yield InvoiceConfiguration_1.default.findOne({ organizationId });
            if (!invoiceConfig) {
                throw new Error("No se encontró configuración para envío de correos");
            }
            // Usar API key desde variables de entorno
            apiKey.apiKey = api_key;
            if (!apiKey.apiKey) {
                throw new Error("No se encontró la clave API de Brevo en las variables de entorno");
            }
            // Crear objeto de email
            let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            // Preparar la solicitud de envío
            sendSmtpEmail.subject = subject;
            // Si hay un templateId, usarlo en lugar del contenido HTML directo
            if (templateId && templateId.trim() !== '') {
                sendSmtpEmail.templateId = parseInt(templateId);
                // Configurar variables dinámicas para la plantilla si es necesario
                sendSmtpEmail.params = {
                    subject: subject
                };
            }
            else {
                sendSmtpEmail.htmlContent = html || text || '';
            }
            sendSmtpEmail.sender = { name: 'Facturación', email: from || invoiceConfig.email.mail_username };
            // Convertir el destinatario a formato requerido por la API
            if (Array.isArray(to)) {
                sendSmtpEmail.to = to.map(email => ({ email, name: email.split('@')[0] }));
            }
            else {
                sendSmtpEmail.to = [{ email: to, name: to.split('@')[0] }];
            }
            // Agregar adjuntos si existen
            if (attachments && attachments.length > 0) {
                sendSmtpEmail.attachment = attachments.map(attachment => ({
                    content: attachment.content,
                    name: attachment.name,
                    contentType: attachment.contentType
                }));
            }
            // Configurar headers y replyTo
            sendSmtpEmail.headers = { "X-Organization-ID": organizationId };
            sendSmtpEmail.replyTo = { email: sendSmtpEmail.sender.email, name: sendSmtpEmail.sender.name };
            // Enviar el correo
            yield apiInstance.sendTransacEmail(sendSmtpEmail);
        }
        else {
            // Usar la configuración de Brevo en la organización
            apiKey.apiKey = organization.settings.masiveEmails.apiKey;
            let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.subject = subject;
            // Si hay un templateId, usarlo en lugar del contenido HTML directo
            if (templateId && templateId.trim() !== '') {
                sendSmtpEmail.templateId = parseInt(templateId);
                // Configurar variables dinámicas para la plantilla si es necesario
                sendSmtpEmail.params = {
                    subject: subject
                };
            }
            else {
                sendSmtpEmail.htmlContent = html || text || '';
            }
            sendSmtpEmail.sender = {
                name: organization.settings.masiveEmails.senderName || 'Facturación',
                email: from || organization.settings.masiveEmails.senderEmail
            };
            // Convertir el destinatario a formato requerido por la API
            if (Array.isArray(to)) {
                sendSmtpEmail.to = to.map(email => ({ email, name: email.split('@')[0] }));
            }
            else {
                sendSmtpEmail.to = [{ email: to, name: to.split('@')[0] }];
            }
            if (attachments && attachments.length > 0) {
                sendSmtpEmail.attachment = attachments.map(attachment => ({
                    content: attachment.content,
                    name: attachment.name,
                    contentType: attachment.contentType
                }));
            }
            // Configurar headers y replyTo
            sendSmtpEmail.headers = { "X-Organization-ID": organizationId };
            sendSmtpEmail.replyTo = { email: sendSmtpEmail.sender.email, name: sendSmtpEmail.sender.name };
            // Enviar el correo
            yield apiInstance.sendTransacEmail(sendSmtpEmail);
        }
        return true;
    }
    catch (error) {
        console.error('Error enviando email con Brevo:', error);
        throw new Error(`Error al enviar email Brevo: ${error instanceof Error ? error.message : String(error)}`);
    }
});
exports.sendEmailWithBrevo = sendEmailWithBrevo;
