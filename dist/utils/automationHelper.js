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
exports.exampleWebhookIntegration = exports.AutomationHelper = void 0;
const automationService_1 = require("../services/conversations/automationService");
/**
 * Helper para verificar y ejecutar automatizaciones de manera segura
 */
class AutomationHelper {
    /**
     * Verifica si se puede ejecutar una automatización y la registra si es exitosa
     * @param conversationId - ID de la conversación
     * @param automationType - Tipo de automatización (greeting, follow_up, etc.)
     * @param automationFunction - Función que ejecuta la automatización
     * @param triggeredBy - Usuario que dispara la automatización (opcional)
     * @returns Promise<boolean> - true si se ejecutó, false si no
     */
    static executeIfAllowed(conversationId, automationType, automationFunction, triggeredBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar si la automatización puede ejecutarse
                const canTrigger = yield automationService_1.AutomationService.canTriggerAutomation({
                    conversationId,
                    automationType,
                });
                if (!canTrigger) {
                    return false;
                }
                // Ejecutar la automatización
                yield automationFunction();
                // Registrar que la automatización fue ejecutada
                yield automationService_1.AutomationService.recordAutomationTriggered(conversationId, automationType, triggeredBy);
                return true;
            }
            catch (error) {
                console.error(`Error ejecutando automatización '${automationType}':`, error);
                return false;
            }
        });
    }
    /**
     * Ejemplo de uso para saludo automático
     */
    static sendGreetingIfAllowed(conversationId, phoneNumber, sendMessageFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeIfAllowed(conversationId, "greeting", () => __awaiter(this, void 0, void 0, function* () {
                const greetingMessage = "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?";
                yield sendMessageFunction(phoneNumber, greetingMessage);
            }), "system");
        });
    }
    /**
     * Ejemplo de uso para mensaje de seguimiento
     */
    static sendFollowUpIfAllowed(conversationId, phoneNumber, sendMessageFunction, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeIfAllowed(conversationId, "follow_up", () => __awaiter(this, void 0, void 0, function* () {
                const followUpMessage = "¿Hay algo más en lo que podamos ayudarte?";
                yield sendMessageFunction(phoneNumber, followUpMessage);
            }), userId || "system");
        });
    }
    /**
     * Ejemplo de uso para recordatorio
     */
    static sendReminderIfAllowed(conversationId, phoneNumber, sendMessageFunction, reminderMessage, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeIfAllowed(conversationId, "reminder", () => __awaiter(this, void 0, void 0, function* () {
                yield sendMessageFunction(phoneNumber, reminderMessage);
            }), userId || "system");
        });
    }
    /**
     * Verifica si las automatizaciones están activas para una conversación
     */
    static areAutomationsActive(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return automationService_1.AutomationService.areAutomationsActive(conversationId);
        });
    }
    /**
     * Obtiene el historial de automatizaciones para debugging
     */
    static getAutomationHistory(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return automationService_1.AutomationService.getAutomationHistory(conversationId);
        });
    }
}
exports.AutomationHelper = AutomationHelper;
/**
 * Ejemplo de integración en un webhook de WhatsApp
 */
const exampleWebhookIntegration = (conversationId, phoneNumber, messageText, sendMessage) => __awaiter(void 0, void 0, void 0, function* () {
    // Verificar si es el primer mensaje de la conversación
    const isFirstMessage = messageText.toLowerCase().includes("hola") ||
        messageText.toLowerCase().includes("hello");
    if (isFirstMessage) {
        // Intentar enviar saludo automático
        const greetingSent = yield AutomationHelper.sendGreetingIfAllowed(conversationId, phoneNumber, sendMessage);
        if (greetingSent) {
            console.log("Saludo automático enviado");
        }
        else {
            console.log("Saludo automático bloqueado (ya se envió anteriormente o automatizaciones pausadas)");
        }
    }
    // Ejemplo de seguimiento después de cierto tiempo
    // (esto normalmente se haría con un cron job o sistema de colas)
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield AutomationHelper.sendFollowUpIfAllowed(conversationId, phoneNumber, sendMessage);
    }), 30 * 60 * 1000); // 30 minutos después
});
exports.exampleWebhookIntegration = exampleWebhookIntegration;
