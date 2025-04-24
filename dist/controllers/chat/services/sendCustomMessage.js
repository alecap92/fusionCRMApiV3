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
exports.sendCustomMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const UserModel_1 = __importDefault(require("../../../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel")); // Importar el MessageModel unificado
const socket_1 = require("../../../config/socket");
const apiUrl = process.env.WHATSAPP_API_URL;
const sendCustomMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("sendCustomMessage");
    const { to, message, messageType, mediaUrl, caption } = req.body;
    if (!to || !messageType || (messageType === "text" && !message)) {
        console.error("Missing required parameters");
        return res.status(400).json({ error: "Missing required parameters" });
    }
    try {
        if (!req.user) {
            console.error("User not found");
            return res.status(400).json({ error: "User not found" });
        }
        const user = yield UserModel_1.default.findById(req.user._id);
        if (!user) {
            console.error("User not found");
            return res.status(400).json({ error: "User not found" });
        }
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        });
        if (!organization) {
            console.error("Organization not found");
            return res.status(400).json({ error: "Organization not found" });
        }
        const token = req.headers.authorization;
        if (!token) {
            console.error("Authorization token missing");
            return res.status(401).json({ error: "Authorization token missing" });
        }
        const { accessToken, numberIdIdentifier } = organization.settings.whatsapp;
        const whatsappApiUrl = `${apiUrl}/${numberIdIdentifier}/messages`;
        let payload;
        // Switch para definir el tipo de mensaje
        switch (messageType) {
            case "text":
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    text: { body: message },
                };
                break;
            case "image":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for image messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "image",
                    image: {
                        link: mediaUrl,
                        caption: caption || "", // Caption es opcional
                    },
                };
                break;
            case "document":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for document messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "document",
                    document: {
                        link: mediaUrl,
                        caption: caption || "", // Caption es opcional
                    },
                };
                break;
            case "video":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for video messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "video",
                    video: {
                        link: mediaUrl,
                        caption: caption || "", // Caption es opcional
                    },
                };
                break;
            case "audio":
                if (!mediaUrl) {
                    return res
                        .status(400)
                        .json({ error: "mediaUrl is required for audio messages" });
                }
                payload = {
                    messaging_product: "whatsapp",
                    to,
                    type: "audio",
                    audio: {
                        link: mediaUrl,
                    },
                };
                break;
            default:
                return res.status(400).json({ error: "Unsupported message type" });
        }
        const response = yield axios_1.default.post(whatsappApiUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const messageId = (_a = response.data.messages[0]) === null || _a === void 0 ? void 0 : _a.id;
        if (response.status === 200 || response.status === 201) {
            // Crear y almacenar el mensaje usando el nuevo MessageModel
            const outgoingMessage = yield MessageModel_1.default.create({
                user: user._id,
                organization: organization._id,
                from: organization.settings.whatsapp.phoneNumber, // Usar el número del usuario o de la organización
                to,
                message: messageType === "text" ? message : mediaUrl,
                direction: "outgoing",
                type: messageType,
                mediaUrl: mediaUrl || "",
                timestamp: new Date().toISOString(),
                messageId: messageId,
            });
            const io = (0, socket_1.getSocketInstance)();
            io.emit("newMessage", Object.assign(Object.assign({}, outgoingMessage.toObject()), { direction: "outgoing" }));
            return res.status(200).json(outgoingMessage);
        }
        else {
            console.error("Error response from WhatsApp API:", response.data);
            return res.status(500).json({ error: "Error sending message" });
        }
    }
    catch (error) {
        console.log(error.message);
        console.error("Error sending message:");
        return res.status(500).json({ error: "Error sending message" });
    }
});
exports.sendCustomMessage = sendCustomMessage;
