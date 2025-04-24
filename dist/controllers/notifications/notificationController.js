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
exports.resetNotifications = exports.emitNewNotification = exports.getNotifications = void 0;
const IncomingMessageModel_1 = __importDefault(require("../../models/IncomingMessageModel"));
const socket_1 = require("../../config/socket");
const FormResponse_1 = require("../../models/FormResponse");
// Obtener las notificaciones iniciales para una organización
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        // Obtener conteo de mensajes de WhatsApp no leídos
        const unreadWhatsapp = yield IncomingMessageModel_1.default.countDocuments({
            organization: organizationId,
            isRead: false,
        });
        // Obtener conteo de formularios no leídos
        const unreadForms = yield FormResponse_1.FormResponseModel.countDocuments({
            organizationId,
            isRead: false,
        });
        // Retornar los conteos de notificaciones
        return res.status(200).json({
            unreadWhatsapp,
            unreadForms,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "An error occurred while fetching notifications",
            error: error.message,
        });
    }
});
exports.getNotifications = getNotifications;
// Emitir una nueva notificación cuando llega un mensaje nuevo o un formulario
const emitNewNotification = (type, organizationId, count = 1, contact, // Incluye el contacto para identificar el chat
message // Detalles del mensaje
) => {
    const io = (0, socket_1.getSocketInstance)();
    let notificationTitle = "";
    switch (type) {
        case "whatsapp":
            notificationTitle = "Nuevo mensaje de WhatsApp:" + " " + message.message;
            break;
        case "form":
            notificationTitle = "Nuevo formulario recibido:" + " " + message.message;
            break;
    }
    console.log(notificationTitle);
    // Emitir notificación a la sala específica de la organización
    io.to(`organization_${organizationId}`).emit("newNotification", {
        title: notificationTitle,
        type,
        contact, // Incluir el contacto para que el frontend pueda identificarlo
        message, // Incluir el mensaje completo
    });
};
exports.emitNewNotification = emitNewNotification;
// Controlador para manejar la llegada de un nuevo mensaje de WhatsApp
// Resetear el contador de notificaciones no leídas
const resetNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationId } = req.user;
        // Marcar todos los mensajes de WhatsApp como leídos
        yield IncomingMessageModel_1.default.updateMany({ organization: organizationId, isRead: false }, { isRead: true });
        // Marcar todos los formularios como leídos
        yield FormResponse_1.FormResponseModel.updateMany({ organizationId, isRead: false }, { isRead: true });
        // Emitir evento para resetear las notificaciones
        const io = (0, socket_1.getSocketInstance)();
        io.to(`organization_${organizationId}`).emit("newNotification", {
            unreadForm: 0,
            unreadWhatsapp: 0,
        });
        return res
            .status(200)
            .json({ message: "Contador de notificaciones restablecido" });
    }
    catch (error) {
        return res.status(500).json({
            message: "An error occurred while resetting notifications",
            error: error.message,
        });
    }
});
exports.resetNotifications = resetNotifications;
