"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const emailSchema = new mongoose_1.Schema({
    uid: {
        type: Number,
        required: true,
        index: true, // Índice para búsquedas rápidas por UID
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // Índice para filtrar por usuario
    },
    from: {
        type: String,
        required: true,
        index: true, // Índice para búsquedas por remitente
    },
    to: {
        type: [String],
        required: true,
        index: true, // Índice para búsquedas por destinatario
    },
    cc: {
        type: [String],
        default: [],
    },
    bcc: {
        type: [String],
        default: [],
    },
    subject: {
        type: String,
        required: true,
        index: "text", // Índice de texto para búsqueda full-text
    },
    text: {
        type: String,
        index: "text", // Índice de texto para búsqueda full-text
    },
    html: {
        type: String,
    },
    date: {
        type: Date,
        required: true,
        index: -1, // Índice descendente para ordenar por fecha
    },
    contactId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Contact",
        required: false,
        index: true,
    },
    folder: {
        type: String,
        required: true,
        default: "INBOX",
        index: true, // Índice para filtrar por carpeta
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true, // Índice para filtrar correos no leídos
    },
    isStarred: {
        type: Boolean,
        default: false,
        index: true,
    },
    isImportant: {
        type: Boolean,
        default: false,
        index: true,
    },
    labels: {
        type: [String],
        default: [],
        index: true,
    },
    threadId: {
        type: String,
        index: true, // Índice para agrupar conversaciones
    },
    inReplyTo: {
        type: String,
        index: true,
    },
    messageId: {
        type: String,
        required: true,
        unique: true, // Garantizar unicidad del mensaje
        index: true,
    },
    priority: {
        type: String,
        enum: ["low", "normal", "high"],
        default: "normal",
        index: true,
    },
    flags: {
        type: [String],
        default: [],
    },
    size: {
        type: Number,
        index: true, // Para consultas de uso de almacenamiento
    },
    snippet: {
        type: String,
        maxlength: 200, // Limitar el snippet a 200 caracteres
    },
    hasAttachments: {
        type: Boolean,
        default: false,
        index: true, // Para filtrar correos con adjuntos
    },
    isEncrypted: {
        type: Boolean,
        default: false,
        index: true,
    },
    spamScore: {
        type: Number,
        min: 0,
        max: 100,
        index: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        index: true, // Para multi-tenant
    },
    attachments: [
        {
            filename: { type: String, required: true },
            contentType: { type: String, required: true },
            size: { type: Number },
            partID: { type: String },
        },
    ],
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
// Índices compuestos para consultas complejas
emailSchema.index({ userId: 1, folder: 1, date: -1 }); // Para listar correos por carpeta
emailSchema.index({ userId: 1, isRead: 1, date: -1 }); // Para correos no leídos
emailSchema.index({ userId: 1, threadId: 1, date: 1 }); // Para conversaciones
emailSchema.index({ userId: 1, from: 1, date: -1 }); // Para correos por remitente
emailSchema.index({ userId: 1, hasAttachments: 1, date: -1 }); // Para correos con adjuntos
emailSchema.index({ userId: 1, isStarred: 1, date: -1 }); // Para correos favoritos
emailSchema.index({ userId: 1, labels: 1, date: -1 }); // Para correos por etiqueta
// Índice único compuesto para evitar duplicados
emailSchema.index({ userId: 1, uid: 1 }, { unique: true });
// Middleware pre-save para generar snippet y detectar adjuntos
emailSchema.pre("save", function (next) {
    // Generar snippet del contenido
    if (this.text && !this.snippet) {
        this.snippet = this.text.substring(0, 200).replace(/\s+/g, " ").trim();
    }
    else if (this.html && !this.snippet) {
        // Extraer texto del HTML para el snippet
        const textFromHtml = this.html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        this.snippet = textFromHtml.substring(0, 200);
    }
    // Detectar si tiene adjuntos
    this.hasAttachments = !!(this.attachments && this.attachments.length > 0);
    // Generar messageId si no existe
    if (!this.messageId) {
        this.messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${this.userId}`;
    }
    next();
});
// Métodos estáticos útiles
emailSchema.statics.findByThread = function (userId, threadId) {
    return this.find({ userId, threadId }).sort({ date: 1 });
};
emailSchema.statics.findUnread = function (userId, folder) {
    const query = { userId, isRead: false };
    if (folder)
        query.folder = folder;
    return this.find(query).sort({ date: -1 });
};
emailSchema.statics.findByLabel = function (userId, label) {
    return this.find({ userId, labels: label }).sort({ date: -1 });
};
emailSchema.statics.getStorageUsage = function (userId) {
    return this.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalSize: { $sum: "$size" }, count: { $sum: 1 } } },
    ]);
};
// Métodos de instancia
emailSchema.methods.markAsRead = function () {
    this.isRead = true;
    return this.save();
};
emailSchema.methods.markAsUnread = function () {
    this.isRead = false;
    return this.save();
};
emailSchema.methods.addLabel = function (label) {
    if (!this.labels.includes(label)) {
        this.labels.push(label);
        return this.save();
    }
    return Promise.resolve(this);
};
emailSchema.methods.removeLabel = function (label) {
    this.labels = this.labels.filter((l) => l !== label);
    return this.save();
};
exports.default = (0, mongoose_1.model)("Email", emailSchema);
