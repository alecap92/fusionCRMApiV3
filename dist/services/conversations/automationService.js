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
exports.AutomationService = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const mongoose_1 = require("mongoose");
class AutomationService {
    static convertToAutomationUser(userId) {
        if (!userId)
            return undefined;
        if (userId === "system")
            return "system";
        return typeof userId === "string" ? new mongoose_1.Types.ObjectId(userId) : userId;
    }
    /**
     * Pausa las automatizaciones para una conversación
     */
    static pauseAutomations(_a) {
        return __awaiter(this, arguments, void 0, function* ({ conversationId, duration, userId, }) {
            try {
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    throw new Error("Conversación no encontrada");
                }
                let pausedUntil;
                if (duration !== "forever") {
                    const now = new Date();
                    const durationMap = {
                        "30m": 30 * 60 * 1000,
                        "1h": 60 * 60 * 1000,
                        "3h": 3 * 60 * 60 * 1000,
                        "6h": 6 * 60 * 60 * 1000,
                        "12h": 12 * 60 * 60 * 1000,
                        "1d": 24 * 60 * 60 * 1000,
                    };
                    pausedUntil = new Date(now.getTime() + durationMap[duration]);
                }
                conversation.automationSettings = Object.assign(Object.assign({}, conversation.automationSettings), { isPaused: true, pausedUntil, pausedBy: this.convertToAutomationUser(userId), pauseReason: duration });
                yield conversation.save();
                return conversation;
            }
            catch (error) {
                console.error("Error pausando automatizaciones:", error);
                throw error;
            }
        });
    }
    /**
     * Reanuda las automatizaciones para una conversación
     */
    static resumeAutomations(conversationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!conversationId) {
                    throw new Error("ID de conversación no proporcionado");
                }
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    throw new Error("Conversación no encontrada");
                }
                conversation.automationSettings = Object.assign(Object.assign({}, conversation.automationSettings), { isPaused: false, pausedUntil: undefined, pausedBy: this.convertToAutomationUser(userId), pauseReason: undefined });
                yield conversation.save();
                return conversation;
            }
            catch (error) {
                console.error("Error reanudando automatizaciones:", error);
                throw error;
            }
        });
    }
    /**
     * Verifica si las automatizaciones están activas para una conversación
     */
    static areAutomationsActive(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    return false;
                }
                const { automationSettings } = conversation;
                // Si no está pausado, las automatizaciones están activas
                if (!automationSettings.isPaused) {
                    return true;
                }
                // Si está pausado para siempre, no están activas
                if (!automationSettings.pausedUntil) {
                    return false;
                }
                // Si está pausado temporalmente, verificar si ya expiró
                const now = new Date();
                if (automationSettings.pausedUntil <= now) {
                    // La pausa expiró, reactivar automatizaciones
                    yield this.resumeAutomations(conversationId, "system");
                    return true;
                }
                return false;
            }
            catch (error) {
                console.error("Error verificando estado de automatizaciones:", error);
                return false;
            }
        });
    }
    /**
     * Verifica si una automatización específica puede ejecutarse
     */
    static canTriggerAutomation(_a) {
        return __awaiter(this, arguments, void 0, function* ({ conversationId, automationType, }) {
            try {
                // Primero verificar si las automatizaciones están activas
                const areActive = yield this.areAutomationsActive(conversationId);
                if (!areActive) {
                    return false;
                }
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    return false;
                }
                // Verificar si esta automatización ya se ejecutó
                const hasTriggered = conversation.automationSettings.automationHistory.some((history) => history.automationType === automationType);
                // Para ciertos tipos de automatización (como saludo), solo permitir una vez
                const oneTimeAutomations = ["greeting", "welcome"];
                if (oneTimeAutomations.includes(automationType) && hasTriggered) {
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error("Error verificando si puede disparar automatización:", error);
                return false;
            }
        });
    }
    /**
     * Registra que una automatización fue ejecutada
     */
    static recordAutomationTriggered(conversationId, automationType, triggeredBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!conversationId) {
                    throw new Error("ID de conversación no proporcionado");
                }
                const conversation = yield ConversationModel_1.default.findById(conversationId);
                if (!conversation) {
                    throw new Error("Conversación no encontrada");
                }
                conversation.automationSettings.automationHistory.push({
                    automationType,
                    triggeredAt: new Date(),
                    triggeredBy: this.convertToAutomationUser(triggeredBy),
                });
                conversation.automationSettings.lastAutomationTriggered = new Date();
                yield conversation.save();
                return conversation;
            }
            catch (error) {
                console.error("Error registrando automatización ejecutada:", error);
                throw error;
            }
        });
    }
    /**
     * Obtiene el historial de automatizaciones de una conversación
     */
    static getAutomationHistory(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversation = yield ConversationModel_1.default.findById(conversationId).populate("automationSettings.automationHistory.triggeredBy", "firstName lastName email");
                if (!conversation) {
                    throw new Error("Conversación no encontrada");
                }
                return conversation.automationSettings.automationHistory;
            }
            catch (error) {
                console.error("Error obteniendo historial de automatizaciones:", error);
                throw error;
            }
        });
    }
}
exports.AutomationService = AutomationService;
