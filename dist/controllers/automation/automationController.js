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
exports.getNodeTypes = exports.getAvailableModules = exports.executeAutomation = exports.toggleAutomationActive = exports.deleteAutomation = exports.updateAutomation = exports.createAutomation = exports.getAutomation = exports.getAutomations = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AutomationModel_1 = __importDefault(require("../../models/AutomationModel"));
// import { automationExecutionService } from "../../services/automation/automationExecutionService";
/**
 * Manejo de errores uniforme para los controladores de automatización
 * @param res - Objeto de respuesta Express
 * @param error - Error capturado
 * @param statusCode - Código de estado HTTP (default: 500)
 * @param defaultMessage - Mensaje por defecto si no hay uno en el error
 */
const handleError = (res, error, statusCode = 500, defaultMessage = "Error del servidor") => {
    console.error(`[Automation Controller Error]: ${error.message || error}`);
    // Si es un error de validación de Mongoose
    if (error.name === "ValidationError") {
        return res.status(400).json({
            message: "Error de validación",
            errors: Object.values(error.errors).map((e) => e.message),
        });
    }
    // Si es un error personalizado con mensaje
    if (error.message) {
        return res.status(statusCode).json({ message: error.message });
    }
    // Error genérico
    return res.status(statusCode).json({ message: defaultMessage });
};
/**
 * Validación básica de una automatización
 * @param nodes - Array de nodos a validar
 * @returns Objeto con resultado de validación {isValid, message}
 */
const validateAutomation = (nodes) => {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        return {
            isValid: false,
            message: "La automatización debe contener al menos un nodo",
        };
    }
    // Verificar que hay al menos un trigger
    const hasTrigger = nodes.some((node) => node.type === "trigger");
    if (!hasTrigger) {
        return {
            isValid: false,
            message: "La automatización debe comenzar con al menos un nodo de tipo trigger",
        };
    }
    // Verificar que todos los nodos tienen ID único
    const nodeIds = nodes.map((node) => node.id);
    if (new Set(nodeIds).size !== nodeIds.length) {
        return {
            isValid: false,
            message: "Todos los nodos deben tener un ID único",
        };
    }
    // Verificar conexiones entre nodos
    const nodeIdSet = new Set(nodeIds);
    for (const node of nodes) {
        // Validar referencias a otros nodos
        if (node.type !== "send_email" && node.type !== "send_whatsapp") {
            if (node.next) {
                for (const nextId of node.next) {
                    if (!nodeIdSet.has(nextId)) {
                        return {
                            isValid: false,
                            message: `El nodo ${node.id} hace referencia a un nodo inexistente (${nextId})`,
                        };
                    }
                }
            }
        }
        // Validar nodos de condición
        if (node.type === "condition") {
            if (!node.conditions ||
                !Array.isArray(node.conditions) ||
                node.conditions.length === 0) {
                return {
                    isValid: false,
                    message: `El nodo de condición ${node.id} debe tener al menos una condición definida`,
                };
            }
            if (!node.trueNext || !Array.isArray(node.trueNext)) {
                return {
                    isValid: false,
                    message: `El nodo de condición ${node.id} debe tener definida la ruta para cuando se cumple la condición (trueNext)`,
                };
            }
            if (!node.falseNext || !Array.isArray(node.falseNext)) {
                return {
                    isValid: false,
                    message: `El nodo de condición ${node.id} debe tener definida la ruta para cuando no se cumple la condición (falseNext)`,
                };
            }
            // Verificar que trueNext y falseNext hacen referencia a nodos existentes
            for (const nextId of [...node.trueNext, ...node.falseNext]) {
                if (!nodeIdSet.has(nextId)) {
                    return {
                        isValid: false,
                        message: `El nodo de condición ${node.id} hace referencia a un nodo inexistente (${nextId})`,
                    };
                }
            }
        }
        // Validar nodos por tipo
        switch (node.type) {
            case "trigger":
                if (!node.module || !node.event) {
                    return {
                        isValid: false,
                        message: `El nodo trigger ${node.id} debe tener módulo y evento definidos`,
                    };
                }
                break;
            case "http_request":
                if (!node.method || !node.url) {
                    return {
                        isValid: false,
                        message: `El nodo http_request ${node.id} debe tener método y URL definidos`,
                    };
                }
                break;
            case "send_email":
                if (!node.to || !node.subject || !node.emailBody) {
                    return {
                        isValid: false,
                        message: `El nodo send_email ${node.id} debe tener destinatario, asunto y cuerpo definidos`,
                    };
                }
                break;
            case "send_whatsapp":
                if (!node.to || !node.message) {
                    return {
                        isValid: false,
                        message: `El nodo send_whatsapp ${node.id} debe tener destinatario y mensaje definidos`,
                    };
                }
                break;
            case "delay":
                if (node.delayMinutes === undefined ||
                    isNaN(node.delayMinutes) ||
                    node.delayMinutes < 0) {
                    return {
                        isValid: false,
                        message: `El nodo delay ${node.id} debe tener un tiempo de espera válido en minutos`,
                    };
                }
                break;
            case "send_mass_email":
                if (!node.listId || !node.subject || !node.emailBody) {
                    return {
                        isValid: false,
                        message: `El nodo send_mass_email ${node.id} debe tener listId, asunto y cuerpo del email definidos`,
                    };
                }
                break;
        }
    }
    return { isValid: true };
};
/**
 * Procesa los nodos desde el formato de React Flow al formato de almacenamiento
 * @param nodes - Array de nodos del frontend
 * @returns Array de nodos procesados para almacenamiento
 */
const processNodesFromFrontend = (nodes) => {
    return nodes.map((node) => {
        // Si el nodo viene en formato React Flow, extraemos la data
        if (node.data && typeof node.data === "object") {
            // Extraer las propiedades base del nodo
            const { id, type } = node;
            // Combinar con las propiedades específicas de data
            return Object.assign({ id, type: type }, node.data);
        }
        // Si ya viene en el formato correcto, lo devolvemos tal cual
        return node;
    });
};
/**
 * @route GET /api/v1/automations
 * @desc Obtiene todas las automatizaciones de la organización actual con filtros opcionales
 * @access Privado
 */
const getAutomations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        // Construir query base
        const queryParams = { organizationId };
        // Aplicar filtros
        if (req.query.isActive !== undefined) {
            queryParams.isActive = req.query.isActive === "true";
        }
        // Filtro de búsqueda por nombre
        if (req.query.search && typeof req.query.search === "string") {
            const searchRegex = new RegExp(req.query.search, "i");
            queryParams.$or = [{ name: searchRegex }, { description: searchRegex }];
        }
        // Ejecutar consulta con ordenación
        const automations = yield AutomationModel_1.default.find(queryParams)
            .sort({ updatedAt: -1 })
            .select("-__v")
            .lean();
        // Mapear _id a id para compatibilidad con el frontend
        const formattedAutomations = automations.map((automation) => (Object.assign(Object.assign({}, automation), { id: automation._id.toString(), _id: undefined })));
        return res.status(200).json(formattedAutomations);
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.getAutomations = getAutomations;
/**
 * @route GET /api/v1/automations/:id
 * @desc Obtiene una automatización específica por su ID
 * @access Privado
 */
const getAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de automatización inválido" });
        }
        const automation = yield AutomationModel_1.default.findOne({
            _id: id,
            organizationId,
        })
            .select("-__v")
            .lean();
        if (!automation) {
            return res.status(404).json({ message: "Automatización no encontrada" });
        }
        // Mapear _id a id para compatibilidad con el frontend
        const formattedAutomation = Object.assign(Object.assign({}, automation), { id: automation._id.toString(), _id: undefined });
        return res.status(200).json(formattedAutomation);
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.getAutomation = getAutomation;
/**
 * @route POST /api/v1/automations
 * @desc Crea una nueva automatización
 * @access Privado
 */
const createAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, description, nodes: rawNodes, isActive = false } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        if (!organizationId || !userId) {
            return res
                .status(401)
                .json({ message: "No autorizado: información de usuario incompleta" });
        }
        if (!name || typeof name !== "string" || name.trim() === "") {
            return res
                .status(400)
                .json({ message: "El nombre de la automatización es obligatorio" });
        }
        // Validar estructura de nodos
        if (!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) {
            return res
                .status(400)
                .json({ message: "La automatización debe contener al menos un nodo" });
        }
        // Procesar nodos desde el formato de frontend
        const nodes = processNodesFromFrontend(rawNodes);
        // Validar la automatización
        const validation = validateAutomation(nodes);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }
        // Crear la nueva automatización
        const newAutomation = new AutomationModel_1.default({
            name,
            description,
            isActive,
            nodes,
            organizationId,
            createdBy: userId,
        });
        // Guardar en la base de datos
        yield newAutomation.save();
        // Usar toJSON() que automáticamente convierte _id a id
        return res.status(201).json(newAutomation.toJSON());
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.createAutomation = createAutomation;
/**
 * @route PATCH /api/v1/automations/:id
 * @desc Actualiza una automatización existente
 * @access Privado
 */
const updateAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, description, nodes: rawNodes, isActive } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de automatización inválido" });
        }
        // Verificar que la automatización existe
        const existingAutomation = yield AutomationModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!existingAutomation) {
            return res.status(404).json({ message: "Automatización no encontrada" });
        }
        // Preparar datos de actualización
        const updateData = {};
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return res
                    .status(400)
                    .json({ message: "El nombre no puede estar vacío" });
            }
            updateData.name = name;
        }
        if (description !== undefined) {
            updateData.description = description;
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }
        // Si se proporcionan nodos, procesarlos y validarlos
        if (rawNodes) {
            if (!Array.isArray(rawNodes)) {
                return res
                    .status(400)
                    .json({ message: "Los nodos deben ser un array" });
            }
            const nodes = processNodesFromFrontend(rawNodes);
            // Validar la automatización
            const validation = validateAutomation(nodes);
            if (!validation.isValid) {
                return res.status(400).json({ message: validation.message });
            }
            updateData.nodes = nodes;
        }
        // Actualizar la automatización
        const updatedAutomation = yield AutomationModel_1.default.findOneAndUpdate({ _id: id, organizationId }, updateData, { new: true, runValidators: true });
        return res.status(200).json(updatedAutomation === null || updatedAutomation === void 0 ? void 0 : updatedAutomation.toJSON());
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.updateAutomation = updateAutomation;
/**
 * @route DELETE /api/v1/automations/:id
 * @desc Elimina una automatización
 * @access Privado
 */
const deleteAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de automatización inválido" });
        }
        const deletedAutomation = yield AutomationModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!deletedAutomation) {
            return res.status(404).json({ message: "Automatización no encontrada" });
        }
        return res.status(200).json({
            message: "Automatización eliminada correctamente",
            id: deletedAutomation._id,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.deleteAutomation = deleteAutomation;
/**
 * @route POST /api/v1/automations/:id/toggle
 * @desc Activa o desactiva una automatización
 * @access Privado
 */
const toggleAutomationActive = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de automatización inválido" });
        }
        // Buscar la automatización
        const automation = yield AutomationModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!automation) {
            return res.status(404).json({ message: "Automatización no encontrada" });
        }
        // Cambiar el estado isActive
        automation.isActive = !automation.isActive;
        // Guardar los cambios
        yield automation.save();
        return res.status(200).json({
            message: `Automatización ${automation.isActive ? "activada" : "desactivada"} correctamente`,
            automation: automation.toJSON(),
        });
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.toggleAutomationActive = toggleAutomationActive;
/**
 * @route POST /api/v1/automations/:id/execute
 * @desc Ejecuta manualmente una automatización
 * @access Privado
 */
const executeAutomation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const testData = req.body.testData || {};
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(401)
                .json({ message: "No autorizado: organizationId no encontrado" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de automatización inválido" });
        }
        // Buscar la automatización
        const automation = yield AutomationModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!automation) {
            return res.status(404).json({ message: "Automatización no encontrada" });
        }
        // Ejecutar la automatización usando el servicio
        // const executionId = await automationExecutionService.executeAutomation(
        //   automation.toObject() as any,
        //   testData,
        //   new mongoose.Types.ObjectId().toString() // Generar ID para ejecución manual
        // );
        // TODO: Implementar ejecución de automatizaciones
        const executionId = new mongoose_1.default.Types.ObjectId().toString();
        return res.status(202).json({
            message: "Ejecución de automatización iniciada (simulada)",
            executionId,
            automation: {
                id: automation._id,
                name: automation.name,
            },
        });
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.executeAutomation = executeAutomation;
/**
 * @route GET /api/v1/automations/modules
 * @desc Devuelve la lista de módulos y eventos disponibles para triggers
 * @access Privado
 */
const getAvailableModules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Esta función devuelve los módulos disponibles para triggers
        // En una implementación real, estos podrían venir de una base de datos o configuración
        const availableModules = [
            {
                id: "deals",
                name: "Deals",
                events: [
                    { id: "created", name: "Creado" },
                    { id: "updated", name: "Actualizado" },
                    { id: "status_changed", name: "Cambio de estado" },
                    { id: "assigned", name: "Asignado" },
                ],
            },
            {
                id: "contacts",
                name: "Contactos",
                events: [
                    { id: "created", name: "Creado" },
                    { id: "updated", name: "Actualizado" },
                    { id: "deleted", name: "Eliminado" },
                ],
            },
            {
                id: "tasks",
                name: "Tareas",
                events: [
                    { id: "created", name: "Creada" },
                    { id: "completed", name: "Completada" },
                    { id: "due_date", name: "Fecha de vencimiento" },
                ],
            },
            {
                id: "payments",
                name: "Pagos",
                events: [
                    { id: "received", name: "Recibido" },
                    { id: "failed", name: "Fallido" },
                    { id: "refunded", name: "Reembolsado" },
                ],
            },
        ];
        return res.status(200).json(availableModules);
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.getAvailableModules = getAvailableModules;
/**
 * @route GET /api/v1/automations/nodes/types
 * @desc Devuelve los tipos de nodos disponibles y sus configuraciones
 * @access Privado
 */
const getNodeTypes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Esta función devuelve los tipos de nodos disponibles
        // En una implementación real, estos podrían venir de una base de datos o configuración
        const nodeTypes = [
            {
                type: "trigger",
                name: "Trigger",
                description: "Inicia la automatización cuando ocurre un evento específico",
                category: "triggers",
                configFields: [
                    { name: "module", type: "select", required: true, label: "Módulo" },
                    { name: "event", type: "select", required: true, label: "Evento" },
                    {
                        name: "payloadMatch",
                        type: "json",
                        required: false,
                        label: "Condiciones adicionales",
                    },
                ],
            },
            {
                type: "http_request",
                name: "Petición HTTP",
                description: "Realiza una petición HTTP a un endpoint externo",
                category: "actions",
                configFields: [
                    {
                        name: "method",
                        type: "select",
                        required: true,
                        label: "Método",
                        options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
                    },
                    { name: "url", type: "text", required: true, label: "URL" },
                    {
                        name: "headers",
                        type: "keyvalue",
                        required: false,
                        label: "Cabeceras",
                    },
                    {
                        name: "body",
                        type: "json",
                        required: false,
                        label: "Cuerpo de la petición",
                    },
                ],
            },
            {
                type: "condition",
                name: "Condición",
                description: "Bifurca el flujo basado en condiciones",
                category: "logic",
                configFields: [
                    {
                        name: "conditions",
                        type: "conditions",
                        required: true,
                        label: "Condiciones",
                    },
                ],
            },
            {
                type: "send_email",
                name: "Enviar Email",
                description: "Envía un correo electrónico",
                category: "actions",
                configFields: [
                    { name: "to", type: "text", required: true, label: "Destinatario" },
                    { name: "subject", type: "text", required: true, label: "Asunto" },
                    {
                        name: "emailBody",
                        type: "richtext",
                        required: true,
                        label: "Contenido",
                    },
                ],
            },
            {
                type: "send_whatsapp",
                name: "Enviar WhatsApp",
                description: "Envía un mensaje de WhatsApp",
                category: "actions",
                configFields: [
                    { name: "to", type: "text", required: true, label: "Destinatario" },
                    {
                        name: "message",
                        type: "textarea",
                        required: true,
                        label: "Mensaje",
                    },
                ],
            },
            {
                type: "delay",
                name: "Espera",
                description: "Espera un tiempo determinado antes de continuar",
                category: "logic",
                configFields: [
                    {
                        name: "delayMinutes",
                        type: "number",
                        required: true,
                        label: "Minutos de espera",
                    },
                ],
            },
            {
                type: "transform",
                name: "Transformar datos",
                description: "Transforma los datos para su uso posterior",
                category: "data",
                configFields: [
                    {
                        name: "transformations",
                        type: "transformations",
                        required: true,
                        label: "Transformaciones",
                    },
                ],
            },
            {
                type: "send_mass_email",
                name: "Enviar Emails Masivos",
                description: "Envía correos electrónicos a todos los contactos de una lista",
                category: "actions",
                configFields: [
                    {
                        name: "listId",
                        type: "select",
                        required: true,
                        label: "Lista de Contactos",
                        endpoint: "/api/v1/lists",
                        valueField: "_id",
                        labelField: "name",
                    },
                    { name: "subject", type: "text", required: true, label: "Asunto" },
                    {
                        name: "emailBody",
                        type: "richtext",
                        required: true,
                        label: "Contenido",
                        helpText: "Puedes usar variables como {{contact.firstName}}, {{contact.email}}, etc.",
                    },
                    {
                        name: "from",
                        type: "text",
                        required: false,
                        label: "Remitente",
                        helpText: "Email del remitente. Si no se especifica, se usará el predeterminado.",
                    },
                ],
            },
        ];
        return res.status(200).json(nodeTypes);
    }
    catch (error) {
        return handleError(res, error);
    }
});
exports.getNodeTypes = getNodeTypes;
