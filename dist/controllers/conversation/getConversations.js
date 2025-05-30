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
exports.getConversationById = exports.getConversationsKanban = exports.getConversations = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const MessageModel_1 = __importDefault(require("../../models/MessageModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
/**
 * Obtiene lista de conversaciones para una organización
 */
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { page = 1, limit = 20, search, isResolved, assignedTo, tags, } = req.query;
        const queryConditions = { organization: organizationId };
        // Filtro por estado de resolución
        if (isResolved !== undefined) {
            queryConditions.isResolved = isResolved === "true";
        }
        // Filtro por usuario asignado
        if (assignedTo) {
            queryConditions.assignedTo = assignedTo;
        }
        // Filtro por etiquetas
        if (tags) {
            queryConditions.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }
        // Búsqueda por título
        if (search) {
            queryConditions.title = { $regex: search, $options: "i" };
        }
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;
        const conversations = yield ConversationModel_1.default.find(queryConditions)
            .sort({ lastMessageTimestamp: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate("lastMessage")
            .populate("assignedTo", "name email firstName lastName");
        // Procesar las conversaciones para manejar los casos donde participants.contact.reference es string
        const processedConversations = conversations.map((conversation) => {
            var _a;
            const conversationObj = conversation.toObject();
            // Procesar el participante contacto si tiene un número de teléfono como referencia
            if (conversationObj.participants &&
                conversationObj.participants.contact &&
                typeof conversationObj.participants.contact.reference === "string") {
                // Agregar información adicional al contacto
                conversationObj.participants.contact.displayInfo = {
                    phone: conversationObj.participants.contact.reference,
                    name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
                };
            }
            // Add last message timestamp
            conversationObj.lastMessageTimestamp =
                (_a = conversationObj.lastMessage) === null || _a === void 0 ? void 0 : _a.timestamp;
            conversationObj.mobile = conversationObj.participants.contact.reference;
            return conversationObj;
        });
        const total = yield ConversationModel_1.default.countDocuments(queryConditions);
        // Obtener el último mensaje para cada conversación
        const conversationsWithLastMessage = yield Promise.all(processedConversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
            const lastMessage = yield MessageModel_1.default.findOne({
                $or: [
                    {
                        from: conversation.participants.contact.reference,
                    },
                    {
                        to: conversation.participants.contact.reference,
                    },
                ],
            }).sort({ timestamp: -1 });
            return Object.assign(Object.assign({}, conversation), { lastMessage: lastMessage || null });
        })));
        return res.status(200).json({
            success: true,
            data: conversationsWithLastMessage,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                pages: Math.ceil(total / limitNumber),
            },
        });
    }
    catch (error) {
        console.error("Error al obtener conversaciones:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener conversaciones",
            error: error.message,
        });
    }
});
exports.getConversations = getConversations;
/**
 * Obtiene conversaciones agrupadas por etapas para la vista Kanban
 */
const getConversationsKanban = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { pipelineId, isResolved, assignedTo, tags, search, page = 1, limit = 10, stageId, // Nuevo parámetro para cargar conversaciones de una etapa específica
         } = req.query;
        // Si no se proporciona un pipelineId, usar el predeterminado
        let pipeline;
        if (pipelineId) {
            pipeline = yield ConversationPipelineModel_1.default.findOne({
                _id: pipelineId,
                organization: organizationId,
            });
        }
        else {
            pipeline = yield ConversationPipelineModel_1.default.findOne({
                organization: organizationId,
                isDefault: true,
            });
        }
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el pipeline especificado",
            });
        }
        // Preparamos la respuesta con las etapas vacías
        const kanbanData = pipeline.stages.map((stage) => ({
            stageId: stage._id,
            stageName: stage.name,
            stageOrder: stage.order,
            stageColor: stage.color,
            conversations: [],
            pagination: {
                page: 1,
                limit: parseInt(limit, 10),
                total: 0,
                pages: 0,
                hasMore: false,
            },
        }));
        // Filtros base para todas las etapas
        const baseQueryConditions = {
            organization: organizationId,
            pipeline: pipeline._id,
        };
        // Filtro por estado de resolución
        if (isResolved !== undefined) {
            baseQueryConditions.isResolved = isResolved === "true";
        }
        // Filtro por usuario asignado
        if (assignedTo) {
            baseQueryConditions.assignedTo = assignedTo;
        }
        // Filtro por etiquetas
        if (tags) {
            baseQueryConditions.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }
        // Búsqueda por título
        if (search) {
            baseQueryConditions.title = { $regex: search, $options: "i" };
        }
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        // Si se especifica un stageId, solo cargar conversaciones para esa etapa (paginación)
        if (stageId) {
            const stageIndex = pipeline.stages.findIndex((stage) => stage._id.toString() === stageId);
            if (stageIndex !== -1) {
                const stageQueryConditions = Object.assign(Object.assign({}, baseQueryConditions), { currentStage: stageIndex });
                const skip = (pageNumber - 1) * limitNumber;
                const conversations = yield ConversationModel_1.default.find(stageQueryConditions)
                    .sort({ lastMessageTimestamp: -1 })
                    .skip(skip)
                    .limit(limitNumber)
                    .populate("lastMessage")
                    .populate("assignedTo", "name email profilePicture");
                const total = yield ConversationModel_1.default.countDocuments(stageQueryConditions);
                const pages = Math.ceil(total / limitNumber);
                // Procesar las conversaciones
                const processedConversations = conversations.map((conversation) => {
                    var _a;
                    const conversationObj = conversation.toObject();
                    if (conversationObj.participants &&
                        conversationObj.participants.contact &&
                        typeof conversationObj.participants.contact.reference === "string") {
                        conversationObj.participants.contact.displayInfo = {
                            phone: conversationObj.participants.contact.reference,
                            name: conversationObj.participants.contact.reference,
                        };
                    }
                    conversationObj.lastMessageTimestamp =
                        (_a = conversationObj.lastMessage) === null || _a === void 0 ? void 0 : _a.timestamp;
                    conversationObj.mobile =
                        conversationObj.participants.contact.reference;
                    return conversationObj;
                });
                // Obtener el último mensaje para cada conversación
                const conversationsWithLastMessage = yield Promise.all(processedConversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
                    const lastMessage = yield MessageModel_1.default.findOne({
                        $or: [
                            { from: conversation.participants.contact.reference },
                            { to: conversation.participants.contact.reference },
                        ],
                    }).sort({ timestamp: -1 });
                    return Object.assign(Object.assign({}, conversation), { lastMessage: lastMessage || null });
                })));
                return res.status(200).json({
                    success: true,
                    data: {
                        stageId,
                        conversations: conversationsWithLastMessage,
                        pagination: {
                            page: pageNumber,
                            limit: limitNumber,
                            total,
                            pages,
                            hasMore: pageNumber < pages,
                        },
                    },
                });
            }
        }
        // Carga inicial: obtener las primeras conversaciones de cada etapa
        for (let i = 0; i < pipeline.stages.length; i++) {
            const stageQueryConditions = Object.assign(Object.assign({}, baseQueryConditions), { currentStage: i });
            const conversations = yield ConversationModel_1.default.find(stageQueryConditions)
                .sort({ lastMessageTimestamp: -1 })
                .limit(limitNumber)
                .populate("lastMessage")
                .populate("assignedTo", "name email profilePicture");
            const total = yield ConversationModel_1.default.countDocuments(stageQueryConditions);
            const pages = Math.ceil(total / limitNumber);
            // Procesar las conversaciones
            const processedConversations = conversations.map((conversation) => {
                var _a;
                const conversationObj = conversation.toObject();
                if (conversationObj.participants &&
                    conversationObj.participants.contact &&
                    typeof conversationObj.participants.contact.reference === "string") {
                    conversationObj.participants.contact.displayInfo = {
                        phone: conversationObj.participants.contact.reference,
                        name: conversationObj.participants.contact.reference,
                    };
                }
                conversationObj.lastMessageTimestamp =
                    (_a = conversationObj.lastMessage) === null || _a === void 0 ? void 0 : _a.timestamp;
                conversationObj.mobile = conversationObj.participants.contact.reference;
                return conversationObj;
            });
            // Obtener el último mensaje para cada conversación
            const conversationsWithLastMessage = yield Promise.all(processedConversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
                const lastMessage = yield MessageModel_1.default.findOne({
                    $or: [
                        { from: conversation.participants.contact.reference },
                        { to: conversation.participants.contact.reference },
                    ],
                }).sort({ timestamp: -1 });
                return Object.assign(Object.assign({}, conversation), { lastMessage: lastMessage || null });
            })));
            kanbanData[i].conversations = conversationsWithLastMessage;
            kanbanData[i].pagination = {
                page: 1,
                limit: limitNumber,
                total,
                pages,
                hasMore: pages > 1,
            };
        }
        return res.status(200).json({
            success: true,
            data: {
                pipeline: {
                    id: pipeline._id,
                    name: pipeline.name,
                    isDefault: pipeline.isDefault,
                },
                stages: kanbanData,
            },
        });
    }
    catch (error) {
        console.error("Error al obtener conversaciones para Kanban:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener conversaciones para vista Kanban",
            error: error.message,
        });
    }
});
exports.getConversationsKanban = getConversationsKanban;
/**
 * Obtiene una conversación específica por ID, con sus mensajes
 */
const getConversationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { page = 1, limit = 500 } = req.query;
        const conversation = yield ConversationModel_1.default.findOne({
            _id: id,
            organization: organizationId,
        })
            .populate("assignedTo", "name email profilePicture")
            .populate("pipeline")
            .populate("lastMessage");
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Buscar si el contacto existe en la base de datos
        let contact = null;
        try {
            if (conversation.participants &&
                conversation.participants.contact &&
                conversation.participants.contact.reference) {
                contact = yield ContactModel_1.default.findOne({
                    $or: [
                        {
                            "properties.key": "mobile",
                            "properties.value": {
                                $regex: conversation.participants.contact.reference,
                            },
                        },
                        {
                            "properties.key": "phone",
                            "properties.value": {
                                $regex: conversation.participants.contact.reference,
                            },
                        },
                        {
                            "properties.key": "email",
                            "properties.value": {
                                $regex: conversation.participants.contact.reference,
                            },
                        },
                    ],
                });
            }
        }
        catch (error) {
            console.error("Error obteniendo el contacto:", error);
            // Continuamos con contact = null
        }
        // Procesar conversación
        const conversationObj = conversation.toObject();
        // Procesar el participante contacto si tiene un número de teléfono como referencia
        if (conversationObj.participants &&
            conversationObj.participants.contact &&
            typeof conversationObj.participants.contact.reference === "string") {
            // Agregar información adicional al contacto
            conversationObj.participants.contact.displayInfo = {
                phone: conversationObj.participants.contact.reference,
                name: conversationObj.participants.contact.reference, // Usar el teléfono como nombre por defecto
            };
            conversationObj.participants.contact.contactId = (contact === null || contact === void 0 ? void 0 : contact._id) || null;
        }
        // Agregar lastMessageTimestamp y mobile
        conversationObj.lastMessageTimestamp =
            (_b = conversationObj.lastMessage) === null || _b === void 0 ? void 0 : _b.timestamp;
        conversationObj.mobile =
            conversationObj.participants.contact.reference || "SIN MOVIL";
        // Obtener mensajes de la conversación
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const totalMessages = yield MessageModel_1.default.countDocuments({ conversation: id });
        // Obtener todos los mensajes ordenados cronológicamente y luego aplicar paginación
        const allMessages = yield MessageModel_1.default.find({ conversation: id })
            .sort({ timestamp: 1 }) // Orden cronológico (más antiguos primero)
            .exec();
        // Aplicar paginación manualmente para mantener el orden cronológico
        const startIndex = Math.max(0, allMessages.length - pageNumber * limitNumber);
        const endIndex = allMessages.length - (pageNumber - 1) * limitNumber;
        const messages = allMessages.slice(startIndex, endIndex);
        return res.status(200).json({
            success: true,
            data: {
                conversation: conversationObj,
                messages,
                pagination: {
                    total: totalMessages,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: Math.ceil(totalMessages / limitNumber),
                },
            },
        });
    }
    catch (error) {
        console.error("Error al obtener conversación:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener conversación",
            error: error.message,
        });
    }
});
exports.getConversationById = getConversationById;
