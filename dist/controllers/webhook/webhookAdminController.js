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
exports.deleteWebhookEndpoint = exports.regenerateWebhookSecret = exports.updateWebhookEndpoint = exports.createWebhookEndpoint = exports.getWebhookEndpoints = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
// import { nanoid } from 'nanoid'; // Reemplazando esta importación
const WebhookEndpointModel_1 = __importDefault(require("../../models/WebhookEndpointModel"));
// Función auxiliar para nanoid como importación dinámica
const generateNanoId = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (size = 10) {
    const { nanoid } = yield Promise.resolve().then(() => __importStar(require('nanoid')));
    return nanoid(size);
});
/**
 * Obtiene todos los endpoints de webhook registrados para una organización
 */
const getWebhookEndpoints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        return res
            .status(401)
            .json({ message: "Organización no encontrada en el usuario" });
    }
    try {
        // Obtener todos los endpoints y añadir la URL completa
        const endpoints = yield WebhookEndpointModel_1.default.find({ organizationId });
        // Añadir la URL completa a cada endpoint
        const endpointsWithUrl = endpoints.map(endpoint => {
            const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;
            return Object.assign(Object.assign({}, endpoint.toObject()), { fullUrl: webhookUrl });
        });
        return res.status(200).json(endpointsWithUrl);
    }
    catch (error) {
        return res.status(500).json({
            message: "Error al obtener endpoints de webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getWebhookEndpoints = getWebhookEndpoints;
/**
 * Crea un nuevo endpoint de webhook
 */
const createWebhookEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, module, event, isActive = true, organizationId, createdBy } = req.body;
    if (!organizationId) {
        return res
            .status(401)
            .json({ message: "Organización no encontrada en el usuario" });
    }
    if (!name || !module || !event) {
        return res
            .status(400)
            .json({ message: "Nombre, módulo y evento son requeridos" });
    }
    try {
        // Generar token secreto para el webhook
        const secret = crypto_1.default.randomBytes(32).toString("hex");
        // Generar un ID único para el webhook (10 caracteres) con importación dinámica
        const uniqueId = yield generateNanoId(10);
        const endpoint = new WebhookEndpointModel_1.default({
            name,
            description,
            module,
            event,
            isActive,
            organizationId,
            createdBy,
            secret,
            uniqueId,
        });
        yield endpoint.save();
        // Construir la URL completa del webhook
        const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${uniqueId}`;
        // Devolver el endpoint con la URL completa
        return res.status(201).json(Object.assign(Object.assign({}, endpoint.toObject()), { fullUrl: webhookUrl }));
    }
    catch (error) {
        return res.status(500).json({
            message: "Error al crear endpoint de webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.createWebhookEndpoint = createWebhookEndpoint;
/**
 * Actualiza un endpoint de webhook existente
 */
const updateWebhookEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { name, description, module, event, isActive, uniqueId } = req.body;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ message: "ID válido de organización y endpoint son requeridos" });
    }
    try {
        // Crear un objeto con los campos a actualizar
        const updateFields = {};
        if (name)
            updateFields.name = name;
        if (description !== undefined)
            updateFields.description = description;
        if (module)
            updateFields.module = module;
        if (event)
            updateFields.event = event;
        if (isActive !== undefined)
            updateFields.isActive = isActive;
        if (uniqueId)
            updateFields.uniqueId = uniqueId; // Actualizar uniqueId si se proporciona
        const endpoint = yield WebhookEndpointModel_1.default.findOneAndUpdate({ _id: id, organizationId }, updateFields, { new: true });
        if (!endpoint) {
            return res
                .status(404)
                .json({ message: "Endpoint de webhook no encontrado" });
        }
        // Construir la URL completa del webhook
        const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;
        // Devolver el endpoint con la URL completa
        return res.status(200).json(Object.assign(Object.assign({}, endpoint.toObject()), { fullUrl: webhookUrl }));
    }
    catch (error) {
        return res.status(500).json({
            message: "Error al actualizar endpoint de webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateWebhookEndpoint = updateWebhookEndpoint;
/**
 * Regenera el secreto de un endpoint de webhook
 */
const regenerateWebhookSecret = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ message: "ID válido de organización y endpoint son requeridos" });
    }
    try {
        // Generar nuevo secreto
        const secret = crypto_1.default.randomBytes(32).toString("hex");
        const endpoint = yield WebhookEndpointModel_1.default.findOneAndUpdate({ _id: id, organizationId }, { secret, updatedAt: new Date() }, { new: true });
        if (!endpoint) {
            return res
                .status(404)
                .json({ message: "Endpoint de webhook no encontrado" });
        }
        // Construir la URL completa del webhook
        const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;
        // Devolver el endpoint con la URL completa
        return res.status(200).json(Object.assign(Object.assign({}, endpoint.toObject()), { fullUrl: webhookUrl }));
    }
    catch (error) {
        return res.status(500).json({
            message: "Error al regenerar secreto del webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.regenerateWebhookSecret = regenerateWebhookSecret;
/**
 * Elimina un endpoint de webhook
 */
const deleteWebhookEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ message: "ID válido de organización y endpoint son requeridos" });
    }
    try {
        const endpoint = yield WebhookEndpointModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!endpoint) {
            return res
                .status(404)
                .json({ message: "Endpoint de webhook no encontrado" });
        }
        return res
            .status(200)
            .json({ message: "Endpoint de webhook eliminado correctamente" });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error al eliminar endpoint de webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.deleteWebhookEndpoint = deleteWebhookEndpoint;
