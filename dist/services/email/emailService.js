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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
// services/email/emailService.ts
const brevoEmailService_1 = require("./brevoEmailService");
class EmailService {
    sendEmail(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Usar el servicio real de Brevo
                yield (0, brevoEmailService_1.sendEmailWithBrevo)(Object.assign(Object.assign({}, params), { api_key: process.env.BREVO_API_KEY || '' // Asegúrate de tener esta variable de entorno
                 }));
                return true;
            }
            catch (error) {
                console.error('Error al enviar email:', error);
                // En producción podrías querer manejar este error de otra manera
                return false;
            }
        });
    }
}
exports.EmailService = EmailService;
