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
exports.canTriggerAutomation = exports.getAutomationHistory = exports.getAutomationStatus = exports.resumeAutomations = exports.pauseAutomations = void 0;
const automationService_1 = require("../../services/conversations/automationService");
/**
 * Pausa las automatizaciones para una conversación
 */
const pauseAutomations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { conversationId } = req.params;
        const { duration } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!duration) {
            return res.status(400).json({
                success: false,
                message: "La duración es requerida",
            });
        }
        const validDurations = ["30m", "1h", "3h", "6h", "12h", "1d", "forever"];
        if (!validDurations.includes(duration)) {
            return res.status(400).json({
                success: false,
                message: "Duración inválida",
            });
        }
        const conversation = yield automationService_1.AutomationService.pauseAutomations({
            conversationId,
            duration,
            userId,
        });
        res.json({
            success: true,
            message: "Automatizaciones pausadas exitosamente",
            data: {
                automationSettings: conversation.automationSettings,
            },
        });
    }
    catch (error) {
        console.error("Error pausando automatizaciones:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.pauseAutomations = pauseAutomations;
/**
 * Reanuda las automatizaciones para una conversación
 */
const resumeAutomations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { conversationId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const conversation = yield automationService_1.AutomationService.resumeAutomations(conversationId, userId);
        res.json({
            success: true,
            message: "Automatizaciones reanudadas exitosamente",
            data: {
                automationSettings: conversation.automationSettings,
            },
        });
    }
    catch (error) {
        console.error("Error reanudando automatizaciones:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.resumeAutomations = resumeAutomations;
/**
 * Obtiene el estado de automatizaciones de una conversación
 */
const getAutomationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const isActive = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
        res.json({
            success: true,
            data: {
                isActive,
            },
        });
    }
    catch (error) {
        console.error("Error obteniendo estado de automatizaciones:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.getAutomationStatus = getAutomationStatus;
/**
 * Obtiene el historial de automatizaciones de una conversación
 */
const getAutomationHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const history = yield automationService_1.AutomationService.getAutomationHistory(conversationId);
        res.json({
            success: true,
            data: {
                history,
            },
        });
    }
    catch (error) {
        console.error("Error obteniendo historial de automatizaciones:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.getAutomationHistory = getAutomationHistory;
/**
 * Verifica si una automatización específica puede ejecutarse
 */
const canTriggerAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const { automationType } = req.query;
        if (!automationType || typeof automationType !== "string") {
            return res.status(400).json({
                success: false,
                message: "El tipo de automatización es requerido",
            });
        }
        const canTrigger = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType,
        });
        res.json({
            success: true,
            data: {
                canTrigger,
            },
        });
    }
    catch (error) {
        console.error("Error verificando automatización:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
        });
    }
});
exports.canTriggerAutomation = canTriggerAutomation;
