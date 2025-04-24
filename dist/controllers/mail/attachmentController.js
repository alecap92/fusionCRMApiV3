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
exports.uploadAttachment = exports.getAttachment = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EmailModel_1 = __importDefault(require("../../models/EmailModel"));
/**
 * Descarga un archivo adjunto asociado a un correo.
 */
const getAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { emailId, attachmentId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Buscar el correo con el ID dado
        const email = yield EmailModel_1.default.findOne({ _id: emailId, userId });
        if (!email) {
            return res.status(404).json({ error: "Email not found." });
        }
        // Buscar el archivo adjunto específico
        const attachment = (_b = email === null || email === void 0 ? void 0 : email.attachments) === null || _b === void 0 ? void 0 : _b.find((att) => att.id === attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: "Attachment not found." });
        }
        // Ruta al archivo guardado en el servidor
        const filePath = path_1.default.resolve(__dirname, "../../uploads/", attachment.filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found on the server." });
        }
        // Enviar el archivo como respuesta
        res.download(filePath, attachment.filename);
    }
    catch (error) {
        console.error("Error fetching attachment:", error);
        res.status(500).json({ error: "Failed to fetch attachment." });
    }
});
exports.getAttachment = getAttachment;
/**
 * Sube un archivo adjunto para un correo saliente.
 */
const uploadAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }
        const { originalname, mimetype, size } = req.file;
        res.status(200).json({
            message: "File uploaded successfully.",
            file: {
                originalName: originalname,
                mimeType: mimetype,
                size,
            },
        });
    }
    catch (error) {
        console.error("Error uploading attachment:", error);
        res.status(500).json({ error: "Failed to upload attachment." });
    }
});
exports.uploadAttachment = uploadAttachment;
