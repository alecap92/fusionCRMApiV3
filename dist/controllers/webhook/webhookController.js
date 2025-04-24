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
exports.verifyWebhookById = exports.verifyWebhook = exports.handleWebhookById = exports.handleWebhook = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AutomationModel_1 = __importDefault(require("../../models/AutomationModel"));
const WebhookEndpointModel_1 = __importDefault(require("../../models/WebhookEndpointModel"));
const automationExecutionService_1 = require("../../services/automation/automationExecutionService");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Maneja los webhooks entrantes que pueden disparar automatizaciones
 * @route POST /api/v1/webhooks/:module/:event
 */
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { module, event } = req.params;
    const payload = req.body;
    const organizationId = req.headers["x-organization-id"];
    const providedSecret = req.headers["x-webhook-secret"];
    logger_1.default.info(`Webhook recibido: ${module}/${event}`, {
        module,
        event,
        organizationId,
        hasSecret: !!providedSecret,
        payloadSample: JSON.stringify(payload).substring(0, 200), // Muestra parte del payload para debug
    });
    if (!module || !event) {
        return res.status(400).json({ message: "Módulo y evento son requeridos" });
    }
    try {
        let targetOrganizationId = organizationId;
        // Si se proporciona un secreto, intentar encontrar el webhook por módulo, evento y secreto
        if (providedSecret && !targetOrganizationId) {
            const webhookEndpoint = yield WebhookEndpointModel_1.default.findOne({
                module,
                event,
                secret: providedSecret,
                isActive: true
            });
            if (webhookEndpoint) {
                targetOrganizationId = (_a = webhookEndpoint.organizationId) === null || _a === void 0 ? void 0 : _a.toString();
                logger_1.default.info(`Webhook identificado por secreto: ${module}/${event}`, {
                    webhookId: (_b = webhookEndpoint._id) === null || _b === void 0 ? void 0 : _b.toString(),
                    organizationId: targetOrganizationId
                });
            }
        }
        if (!targetOrganizationId || !mongoose_1.default.Types.ObjectId.isValid(targetOrganizationId)) {
            return res.status(400).json({
                message: "ID de organización válido es requerido en el header 'x-organization-id' o un secreto válido en 'x-webhook-secret'",
            });
        }
        // Buscar automatizaciones activas que coincidan con este evento
        const automations = yield AutomationModel_1.default.find({
            organizationId: targetOrganizationId,
            isActive: true,
            nodes: {
                $elemMatch: {
                    type: "trigger",
                    module,
                    event,
                },
            },
        });
        logger_1.default.info(`Encontradas ${automations.length} automatizaciones que coinciden con ${module}/${event}`, {
            organizationId: targetOrganizationId,
            automationIds: automations.map((a) => a._id.toString()),
        });
        if (automations.length === 0) {
            return res.status(200).json({
                message: "No se encontraron automatizaciones para este evento",
                automationsTriggered: 0,
            });
        }
        // Verificar y ejecutar cada automatización que coincida
        const executionPromises = automations.map((automation) => {
            // Encontrar el nodo trigger específico que coincide
            const triggerNode = automation.nodes.find((node) => node.type === "trigger" &&
                node.module === module &&
                node.event === event);
            // Si el nodo tiene payloadMatch, verificar que coincide
            if (triggerNode === null || triggerNode === void 0 ? void 0 : triggerNode.payloadMatch) {
                const matches = Object.entries(triggerNode.payloadMatch).every(([key, value]) => {
                    // Navegar por la ruta de propiedades anidadas para obtener el valor
                    const payloadValue = key
                        .split(".")
                        .reduce((obj, prop) => obj && obj[prop], payload);
                    // Comparar el valor (considerando posibles RegExp)
                    if (typeof value === "string" &&
                        value.startsWith("/") &&
                        value.endsWith("/")) {
                        // Es una expresión regular (formato: "/pattern/")
                        const pattern = value.slice(1, -1);
                        const regex = new RegExp(pattern);
                        return regex.test(String(payloadValue));
                    }
                    return payloadValue === value;
                });
                if (!matches) {
                    logger_1.default.info(`Automatización ${automation._id} no coincide con payloadMatch`, {
                        triggerNode: triggerNode.id,
                        payloadMatch: triggerNode.payloadMatch,
                    });
                    return null; // No ejecutar esta automatización
                }
            }
            logger_1.default.info(`Ejecutando automatización ${automation._id} por webhook`);
            // Iniciar la ejecución y devolver el ID
            return automationExecutionService_1.automationExecutionService.executeAutomation(automation, payload, new mongoose_1.default.Types.ObjectId().toString());
        });
        // Filtrar promesas nulas (automatizaciones que no coinciden) y ejecutar todas
        const validPromises = executionPromises.filter((p) => p !== null);
        const executionIds = yield Promise.all(validPromises);
        return res.status(200).json({
            message: "Webhook procesado correctamente",
            automationsTriggered: executionIds.length,
            executionIds,
        });
    }
    catch (error) {
        logger_1.default.error("Error al procesar webhook", {
            error: error instanceof Error ? error.message : String(error),
            module,
            event,
            organizationId,
        });
        return res.status(500).json({
            message: "Error al procesar el webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.handleWebhook = handleWebhook;
/**
 * Maneja los webhooks entrantes utilizando un ID único
 * @route POST /api/v1/webhooks/id/:uniqueId
 */
const handleWebhookById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { uniqueId } = req.params;
    const payload = req.body;
    // Obtener el secreto desde el header, si está presente
    const providedSecret = req.headers["x-webhook-secret"];
    logger_1.default.info(`Webhook recibido por ID único: ${uniqueId}`, {
        uniqueId,
        payloadSample: JSON.stringify(payload).substring(0, 200), // Muestra parte del payload para debug
        hasSecret: !!providedSecret
    });
    if (!uniqueId) {
        return res.status(400).json({ message: "ID único del webhook es requerido" });
    }
    try {
        // Buscar el endpoint de webhook por su ID único
        const webhookEndpoint = yield WebhookEndpointModel_1.default.findOne({
            uniqueId,
            isActive: true
        });
        logger_1.default.info(`Búsqueda de webhook con uniqueId: ${uniqueId}, resultado:`, {
            encontrado: !!webhookEndpoint,
            webhookEndpointId: (_a = webhookEndpoint === null || webhookEndpoint === void 0 ? void 0 : webhookEndpoint._id) === null || _a === void 0 ? void 0 : _a.toString(),
        });
        if (!webhookEndpoint) {
            return res.status(404).json({
                message: "Webhook no encontrado o no está activo",
            });
        }
        // Verificar el secreto si se proporciona
        if (providedSecret && webhookEndpoint.secret !== providedSecret) {
            logger_1.default.warn(`Secreto de webhook inválido para ${uniqueId}`, {
                uniqueId,
                webhookId: (_b = webhookEndpoint._id) === null || _b === void 0 ? void 0 : _b.toString(),
            });
            return res.status(401).json({
                message: "Secreto de webhook inválido"
            });
        }
        const { module, event, organizationId } = webhookEndpoint;
        // Loguear más información para diagnóstico
        logger_1.default.info(`Datos del webhook encontrado: module=${module}, event=${event}, orgId=${organizationId}`, {
            uniqueId,
            module,
            event,
            organizationId: organizationId === null || organizationId === void 0 ? void 0 : organizationId.toString(),
        });
        // Buscar automatizaciones activas que coincidan con este módulo y evento
        const automations = yield AutomationModel_1.default.find({
            organizationId,
            isActive: true,
            nodes: {
                $elemMatch: {
                    type: "trigger",
                    module,
                    event,
                },
            },
        });
        // Loguear la consulta para diagnóstico
        logger_1.default.info(`Consulta de automatizaciones: ${JSON.stringify({
            organizationId: organizationId === null || organizationId === void 0 ? void 0 : organizationId.toString(),
            isActive: true,
            "nodes.type": "trigger",
            "nodes.module": module,
            "nodes.event": event,
        })}`);
        logger_1.default.info(`Encontradas ${automations.length} automatizaciones que coinciden con webhook ${uniqueId} (${module}/${event})`, {
            organizationId: organizationId === null || organizationId === void 0 ? void 0 : organizationId.toString(),
            automationIds: automations.map((a) => a._id.toString()),
        });
        if (automations.length === 0) {
            return res.status(200).json({
                message: "No se encontraron automatizaciones para este webhook",
                automationsTriggered: 0,
                webhookInfo: {
                    module,
                    event,
                    organizationId: organizationId === null || organizationId === void 0 ? void 0 : organizationId.toString()
                }
            });
        }
        // Verificar y ejecutar cada automatización que coincida
        const executionPromises = automations.map((automation) => {
            // Encontrar el nodo trigger específico que coincide
            const triggerNode = automation.nodes.find((node) => node.type === "trigger" &&
                node.module === module &&
                node.event === event);
            // Si el nodo tiene payloadMatch, verificar que coincide
            if (triggerNode === null || triggerNode === void 0 ? void 0 : triggerNode.payloadMatch) {
                const matches = Object.entries(triggerNode.payloadMatch).every(([key, value]) => {
                    // Navegar por la ruta de propiedades anidadas para obtener el valor
                    const payloadValue = key
                        .split(".")
                        .reduce((obj, prop) => obj && obj[prop], payload);
                    // Comparar el valor (considerando posibles RegExp)
                    if (typeof value === "string" &&
                        value.startsWith("/") &&
                        value.endsWith("/")) {
                        // Es una expresión regular (formato: "/pattern/")
                        const pattern = value.slice(1, -1);
                        const regex = new RegExp(pattern);
                        return regex.test(String(payloadValue));
                    }
                    return payloadValue === value;
                });
                if (!matches) {
                    logger_1.default.info(`Automatización ${automation._id} no coincide con payloadMatch`, {
                        triggerNode: triggerNode.id,
                        payloadMatch: triggerNode.payloadMatch,
                    });
                    return null; // No ejecutar esta automatización
                }
            }
            logger_1.default.info(`Ejecutando automatización ${automation._id} por webhook con ID: ${uniqueId}`);
            // Iniciar la ejecución y devolver el ID
            return automationExecutionService_1.automationExecutionService.executeAutomation(automation, payload, new mongoose_1.default.Types.ObjectId().toString());
        });
        // Filtrar promesas nulas (automatizaciones que no coinciden) y ejecutar todas
        const validPromises = executionPromises.filter((p) => p !== null);
        const executionIds = yield Promise.all(validPromises);
        return res.status(200).json({
            message: "Webhook procesado correctamente",
            automationsTriggered: executionIds.length,
            executionIds,
        });
    }
    catch (error) {
        logger_1.default.error("Error al procesar webhook por ID", {
            error: error instanceof Error ? error.message : String(error),
            uniqueId,
            stack: error instanceof Error ? error.stack : undefined
        });
        return res.status(500).json({
            message: "Error al procesar el webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.handleWebhookById = handleWebhookById;
/**
 * Verifica que un webhook sea válido (usado para verificación inicial con plataformas externas)
 * @route GET /api/v1/webhooks/:module/:event
 */
const verifyWebhook = (req, res) => {
    const { module, event } = req.params;
    const challenge = req.query.challenge || req.query.hub_challenge;
    const verifyToken = req.query.verify_token || req.query.hub_verify_token;
    // Si es una verificación de webhook (común en plataformas como Facebook, Stripe, etc.)
    if (challenge && verifyToken) {
        // Verificar que el token coincide con el configurado
        if (verifyToken === process.env.WEBHOOK_VERIFY_TOKEN) {
            logger_1.default.info(`Verificación de webhook exitosa para ${module}/${event}`);
            return res.status(200).send(challenge);
        }
        logger_1.default.warn(`Verificación de webhook fallida para ${module}/${event} - Token inválido`);
        return res.status(401).json({ message: "Token de verificación inválido" });
    }
    // Si es una solicitud normal de verificación de disponibilidad
    return res.status(200).json({
        message: `Endpoint de webhook disponible para ${module}/${event}`,
        module,
        event,
    });
};
exports.verifyWebhook = verifyWebhook;
/**
 * Verifica que un webhook sea válido utilizando su ID único
 * @route GET /api/v1/webhooks/id/:uniqueId
 */
const verifyWebhookById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uniqueId } = req.params;
    const challenge = req.query.challenge || req.query.hub_challenge;
    const verifyToken = req.query.verify_token || req.query.hub_verify_token;
    try {
        // Buscar el endpoint de webhook por su ID único
        const webhookEndpoint = yield WebhookEndpointModel_1.default.findOne({ uniqueId });
        if (!webhookEndpoint) {
            return res.status(404).json({
                message: "Webhook no encontrado",
            });
        }
        const { module, event, isActive } = webhookEndpoint;
        // Si es una verificación de webhook (común en plataformas como Facebook, Stripe, etc.)
        if (challenge && verifyToken) {
            // Verificar que el token coincide con el configurado
            if (verifyToken === process.env.WEBHOOK_VERIFY_TOKEN) {
                logger_1.default.info(`Verificación de webhook exitosa para ID: ${uniqueId}`);
                return res.status(200).send(challenge);
            }
            logger_1.default.warn(`Verificación de webhook fallida para ID: ${uniqueId} - Token inválido`);
            return res.status(401).json({ message: "Token de verificación inválido" });
        }
        // Si es una solicitud normal de verificación de disponibilidad
        return res.status(200).json({
            message: `Endpoint de webhook disponible para ID: ${uniqueId}`,
            uniqueId,
            module,
            event,
            isActive
        });
    }
    catch (error) {
        logger_1.default.error("Error al verificar webhook por ID", {
            error: error instanceof Error ? error.message : String(error),
            uniqueId,
        });
        return res.status(500).json({
            message: "Error al verificar el webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.verifyWebhookById = verifyWebhookById;
