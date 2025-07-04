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
        /*
         * 1. Traer las conversaciones de forma "lean" para reducir overhead.
         * 2. Obtener sólo los campos necesarios.
         */
        const conversations = yield ConversationModel_1.default.find(queryConditions)
            .sort({ lastMessageTimestamp: -1 })
            .skip(skip)
            .limit(limitNumber)
            .select("title participants lastMessageTimestamp pipeline currentStage assignedTo isResolved tags unreadCount")
            .populate("assignedTo", "name email firstName lastName")
            .lean();
        console.log(`[GET_CONVERSATIONS] Obtenidas ${conversations.length} conversaciones`);
        // Si no hay conversaciones, responder inmediatamente
        if (!conversations.length) {
            console.log("[GET_CONVERSATIONS] No se encontraron conversaciones");
            return res.status(200).json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: 0,
                },
            });
        }
        /* ---------- Contactos en lote ---------- */
        console.log("[GET_CONVERSATIONS] Buscando información de contactos");
        const references = [
            ...new Set(conversations
                .map((c) => { var _a, _b; return (_b = (_a = c === null || c === void 0 ? void 0 : c.participants) === null || _a === void 0 ? void 0 : _a.contact) === null || _b === void 0 ? void 0 : _b.reference; })
                .filter(Boolean)),
        ];
        console.log(`[GET_CONVERSATIONS] Referencias de contacto encontradas: ${references.length}`);
        const contactsRaw = yield ContactModel_1.default.find({
            organizationId,
            $or: [
                {
                    "properties.key": "mobile",
                    "properties.value": { $in: references },
                },
                {
                    "properties.key": "phone",
                    "properties.value": { $in: references },
                },
            ],
        })
            .select("properties")
            .lean();
        console.log(`[GET_CONVERSATIONS] Contactos encontrados: ${contactsRaw.length}`);
        const contactsByPhone = {};
        for (const contact of contactsRaw) {
            if (!(contact === null || contact === void 0 ? void 0 : contact.properties))
                continue;
            for (const prop of contact.properties) {
                if ((prop.key === "mobile" || prop.key === "phone") &&
                    references.includes(prop.value)) {
                    contactsByPhone[prop.value] = contact;
                }
            }
        }
        /* ---------- Último mensaje en lote ---------- */
        const conversationIds = conversations.map((c) => c._id);
        const lastMessagesAgg = yield MessageModel_1.default.aggregate([
            { $match: { conversation: { $in: conversationIds } } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$conversation",
                    doc: { $first: "$$ROOT" },
                },
            },
        ]);
        const lastMessagesByConversation = {};
        for (const lm of lastMessagesAgg) {
            lastMessagesByConversation[lm._id.toString()] = lm.doc;
        }
        /* ---------- Construir respuesta ---------- */
        console.log("[GET_CONVERSATIONS] Procesando conversaciones");
        const processedConversations = conversations.map((conversation) => {
            var _a, _b;
            const reference = (_b = (_a = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _a === void 0 ? void 0 : _a.contact) === null || _b === void 0 ? void 0 : _b.reference;
            const contact = reference ? contactsByPhone[reference] : null;
            console.log(`[GET_CONVERSATIONS] Procesando conversación:
        - ID2: ${conversation._id}
        - Título: ${conversation.title}
        - AssignedTo: ${JSON.stringify(conversation.assignedTo)}
        - Reference: ${reference}
        - Contact Found: ${!!contact}
      `);
            // Display info de contacto
            if (reference) {
                const findProp = (key) => { var _a, _b; return (_b = (_a = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _a === void 0 ? void 0 : _a.find((p) => p.key === key)) === null || _b === void 0 ? void 0 : _b.value; };
                conversation.participants.contact.displayInfo = {
                    mobile: reference,
                    name: findProp("firstName") || reference,
                    lastName: findProp("lastName") || "",
                    email: findProp("email") || "",
                    position: findProp("position") || "",
                    contactId: (contact === null || contact === void 0 ? void 0 : contact._id) || null,
                };
                console.log(`[GET_CONVERSATIONS] Display Info generada:
          - Name: ${conversation.participants.contact.displayInfo.name}
          - LastName: ${conversation.participants.contact.displayInfo.lastName}
          - Mobile: ${conversation.participants.contact.displayInfo.mobile}
        `);
            }
            // Añadir mobile helper y último mensaje
            conversation.mobile = reference;
            const lm = lastMessagesByConversation[conversation._id.toString()];
            conversation.lastMessage = lm || null;
            conversation.lastMessageTimestamp =
                (lm === null || lm === void 0 ? void 0 : lm.timestamp) || conversation.lastMessageTimestamp;
            return conversation;
        });
        console.log("[GET_CONVERSATIONS] Todas las conversaciones procesadas");
        const total = yield ConversationModel_1.default.countDocuments(queryConditions);
        return res.status(200).json({
            success: true,
            data: processedConversations,
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
        const { pipelineId, isResolved, assignedTo, tags, search, page = "1", limit = "50", stageId, } = req.query;
        // Convertir y validar los números
        const pageNumber = Math.max(1, parseInt(page));
        const limitNumber = Math.max(50, parseInt(limit));
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
        // Si se especifica un stageId, solo cargar conversaciones para esa etapa
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
                    .populate("assignedTo", "firstName lastName email profilePicture");
                const total = yield ConversationModel_1.default.countDocuments(stageQueryConditions);
                const pages = Math.ceil(total / limitNumber);
                // Procesar las conversaciones
                const processedConversations = conversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                    const conversationObj = conversation.toObject();
                    // Buscar el contacto si existe
                    let contact = null;
                    if (conversationObj.participants &&
                        conversationObj.participants.contact &&
                        typeof conversationObj.participants.contact.reference === "string") {
                        try {
                            contact = yield ContactModel_1.default.findOne({
                                $or: [
                                    {
                                        "properties.key": "mobile",
                                        "properties.value": conversationObj.participants.contact.reference,
                                    },
                                    {
                                        "properties.key": "phone",
                                        "properties.value": conversationObj.participants.contact.reference,
                                    },
                                ],
                                organizationId: conversationObj.organization,
                            });
                        }
                        catch (error) {
                            console.error("Error buscando contacto:", error);
                        }
                        // Agregar información adicional al contacto
                        conversationObj.participants.contact.displayInfo = {
                            mobile: conversationObj.participants.contact.reference,
                            name: ((_b = (_a = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _a === void 0 ? void 0 : _a.find((p) => p.key === "firstName")) === null || _b === void 0 ? void 0 : _b.value) || conversationObj.participants.contact.reference,
                            lastName: ((_d = (_c = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _c === void 0 ? void 0 : _c.find((p) => p.key === "lastName")) === null || _d === void 0 ? void 0 : _d.value) || "",
                            email: ((_f = (_e = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _e === void 0 ? void 0 : _e.find((p) => p.key === "email")) === null || _f === void 0 ? void 0 : _f.value) || "",
                            position: ((_h = (_g = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _g === void 0 ? void 0 : _g.find((p) => p.key === "position")) === null || _h === void 0 ? void 0 : _h.value) || "",
                            contactId: (contact === null || contact === void 0 ? void 0 : contact._id) || null,
                        };
                    }
                    conversationObj.lastMessageTimestamp =
                        (_j = conversationObj.lastMessage) === null || _j === void 0 ? void 0 : _j.timestamp;
                    conversationObj.mobile =
                        conversationObj.participants.contact.reference;
                    return conversationObj;
                }));
                const processedConversationsResolved = yield Promise.all(processedConversations);
                // Obtener el último mensaje para cada conversación
                const conversationsWithLastMessage = yield Promise.all(processedConversationsResolved.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
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
                .populate("assignedTo", "firstName lastName email profilePicture");
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
                        mobile: conversationObj.participants.contact.reference,
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
    var _a, _b, _c;
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
            .lean();
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversación no encontrada",
            });
        }
        // Buscar contacto (único query)
        let contact = null;
        const reference = (_c = (_b = conversation === null || conversation === void 0 ? void 0 : conversation.participants) === null || _b === void 0 ? void 0 : _b.contact) === null || _c === void 0 ? void 0 : _c.reference;
        if (reference) {
            try {
                contact = yield ContactModel_1.default.findOne({
                    $or: [
                        {
                            "properties.key": "mobile",
                            "properties.value": { $regex: reference },
                        },
                        {
                            "properties.key": "phone",
                            "properties.value": { $regex: reference },
                        },
                        {
                            "properties.key": "email",
                            "properties.value": { $regex: reference },
                        },
                    ],
                })
                    .select("properties")
                    .lean();
            }
            catch (error) {
                console.error("Error obteniendo el contacto:", error);
            }
        }
        // Enriquecer conversación con info de contacto
        if (reference) {
            const findProp = (key) => { var _a, _b; return (_b = (_a = contact === null || contact === void 0 ? void 0 : contact.properties) === null || _a === void 0 ? void 0 : _a.find((p) => p.key === key)) === null || _b === void 0 ? void 0 : _b.value; };
            conversation.participants.contact.displayInfo = {
                mobile: reference,
                name: findProp("firstName") || reference,
                lastName: findProp("lastName") || "",
                email: findProp("email") || "",
                position: findProp("position") || "",
                contactId: (contact === null || contact === void 0 ? void 0 : contact._id) || null,
            };
        }
        conversation.mobile = reference || "SIN MOVIL";
        /* ---------- Mensajes paginados directamente desde Mongo ---------- */
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const totalMessages = yield MessageModel_1.default.countDocuments({ conversation: id });
        const messagesDesc = yield MessageModel_1.default.find({ conversation: id })
            .sort({ timestamp: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean();
        // Revertimos para mantener orden cronológico ascendente
        const messages = messagesDesc.reverse();
        return res.status(200).json({
            success: true,
            data: {
                conversation,
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
