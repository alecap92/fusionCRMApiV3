"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const emailSchema = new mongoose_1.Schema({
    uid: { type: Number, required: true, unique: true }, // UID del correo (único en el servidor)
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }, // Relación con el usuario
    from: { type: String, required: true }, // Remitente como string
    to: { type: [String], required: true }, // Destinatarios como array de strings
    subject: { type: String, required: true }, // Asunto del correo
    text: { type: String }, // Texto plano del correo
    html: { type: String }, // Contenido HTML del correo
    date: { type: Date, required: true }, // Fecha del correo,
    contactId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Contact", required: false }, // ID del contacto al que pertenece el correo
    attachments: [
        {
            filename: { type: String, required: true }, // Nombre del archivo adjunto
            contentType: { type: String, required: true }, // Tipo MIME del archivo
            size: { type: Number }, // Tamaño del archivo en bytes
            partID: { type: String }, // Identificador de la parte MIME para descargar del servidor
        },
    ],
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
});
exports.default = (0, mongoose_1.model)("Email", emailSchema);
