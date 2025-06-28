"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, unique: true },
    mobile: { type: String },
    password: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    pushToken: [String],
    firebaseUid: { type: String, required: false }, // UID de Firebase
    avatar: { type: String, required: false }, // URL del avatar
    lastLogoutAt: { type: Date, required: false }, // Campo para rastrear el último logout global
    emailSettings: {
        emailAddress: { type: String, required: true },
        imapSettings: {
            host: { type: String, required: false, default: "" },
            port: { type: Number, required: false, default: 993 },
            user: { type: String, required: false, default: "" },
            password: { type: String, required: false, default: "" },
            tls: { type: Boolean, default: true },
            lastUID: { type: Number, default: 0 }, // Inicializa en 0 si no se usa aún
        },
        smtpSettings: {
            host: { type: String, required: false, default: "" },
            port: { type: Number, required: false, default: 587 },
            user: { type: String, required: false, default: "" },
            password: { type: String, required: false, default: "" },
            secure: { type: Boolean, required: false, default: false }, // Define si usa conexión segura
        },
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("User", userSchema);
