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
exports.sendEmailViaSMTP = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Envía un correo electrónico utilizando configuración SMTP.
 * @param smtpSettings Configuración SMTP del usuario.
 * @param emailData Datos del correo (destinatario, asunto, cuerpo, adjuntos).
 * @returns Información sobre el correo enviado.
 */
const sendEmailViaSMTP = (smtpSettings, emailData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { host, port, user, password } = smtpSettings;
        if (!host || !port || !user || !password) {
            throw new Error("Incomplete SMTP settings provided.");
        }
        // Configurar Nodemailer
        const transporter = nodemailer_1.default.createTransport({
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
            throw new Error("Recipient, subject, and either text or HTML body are required.");
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
        const info = yield transporter.sendMail(mailOptions);
        return info; // Información del correo enviado
    }
    catch (error) {
        throw new Error(`Failed to send email: ${error.response || error.message || "Unknown error"}`);
    }
});
exports.sendEmailViaSMTP = sendEmailViaSMTP;
