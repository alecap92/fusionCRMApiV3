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
    emailSettings: {
        emailAddress: { type: String, required: true },
        imapSettings: {
            host: { type: String, required: true },
            port: { type: Number, required: true },
            user: { type: String, required: true },
            password: { type: String, required: true },
            tls: { type: Boolean },
            lastUID: { type: Number }, // Inicializa en 0 si no se usa aún
        },
        smtpSettings: {
            host: { type: String, required: true },
            port: { type: Number, required: true },
            user: { type: String, required: true },
            password: { type: String, required: true },
            secure: { type: Boolean, required: true }, // Define si usa conexión segura
        },
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("User", userSchema);
