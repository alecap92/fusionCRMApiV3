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
exports.handleWebhook = void 0;
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const getMedia_1 = require("./getMedia");
const notificationController_1 = require("../../notifications/notificationController");
const aws_1 = require("../../../config/aws");
const pushNotificationService_1 = require("./pushNotificationService");
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const body = req.body;
        if (body.object !== "whatsapp_business_account") {
            res.status(400).json({ error: "Invalid webhook payload" });
            return;
        }
        for (const entry of body.entry || []) {
            const { changes } = entry;
            for (const change of changes || []) {
                const value = change.value;
                if (!value.messages)
                    continue;
                const message = value.messages[0];
                const { from, timestamp, type } = message;
                const to = (_a = value.metadata) === null || _a === void 0 ? void 0 : _a.display_phone_number;
                if (!to) {
                    console.error("No display_phone_number in metadata");
                    continue;
                }
                const organization = yield OrganizationModel_1.default.findOne({
                    "settings.whatsapp.phoneNumber": to,
                });
                if (!organization) {
                    console.error(`Organization with WhatsApp number ${to} not found.`);
                    res.status(400).send("Organization not found");
                    return;
                }
                const accessToken = organization.settings.whatsapp.accessToken;
                const systemUserId = organization.employees[0];
                if (!systemUserId) {
                    console.error("No system user found.");
                    res.status(500).send("System user not found");
                    return;
                }
                let text = "";
                let awsUrl = null;
                if (type === "reaction") {
                    yield handleReaction(message, timestamp);
                    continue;
                }
                if (type === "text") {
                    text = message.text.body;
                }
                else if (["image", "document", "audio", "video", "sticker"].includes(type)) {
                    text = `${capitalizeFirstLetter(type)} recibido`;
                    const mediaObject = message[type];
                    if (mediaObject === null || mediaObject === void 0 ? void 0 : mediaObject.id) {
                        const mediaBuffer = yield (0, getMedia_1.getMedia)(mediaObject.id, accessToken);
                        awsUrl = yield (0, aws_1.subirArchivo)(mediaBuffer, mediaObject.id, mediaObject.mime_type);
                    }
                }
                else {
                    text = "Otro tipo de mensaje recibido";
                }
                const repliedMessageId = (_b = message.context) === null || _b === void 0 ? void 0 : _b.id;
                const originalMessage = repliedMessageId
                    ? yield MessageModel_1.default.findOne({ messageId: repliedMessageId })
                    : null;
                yield MessageModel_1.default.create({
                    user: systemUserId,
                    organization: organization._id,
                    from,
                    to,
                    message: text,
                    mediaUrl: awsUrl,
                    mediaId: ((_c = message[type]) === null || _c === void 0 ? void 0 : _c.id) || "",
                    timestamp: new Date(parseInt(timestamp) * 1000),
                    type,
                    direction: "incoming",
                    possibleName: ((_f = (_e = (_d = value.contacts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.profile) === null || _f === void 0 ? void 0 : _f.name) || "",
                    replyToMessage: (originalMessage === null || originalMessage === void 0 ? void 0 : originalMessage._id) || null,
                    messageId: message.id,
                });
                const toTokens = ["ExponentPushToken[I5cjWVDWDbnjGPUqFdP2dL]"];
                try {
                    yield (0, pushNotificationService_1.sendNotification)(toTokens, {
                        title: ((_j = (_h = (_g = value.contacts) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.profile) === null || _j === void 0 ? void 0 : _j.name) || "",
                        body: text
                    });
                }
                catch (error) {
                    console.log(error, "Error sending push notification");
                }
                (0, notificationController_1.emitNewNotification)("whatsapp", organization._id, 1, from, {
                    message: text,
                    timestamp: new Date(parseInt(timestamp) * 1000),
                });
            }
        }
        res.status(200).send("Mensaje recibido");
    }
    catch (error) {
        console.error("Error handling webhook:", error);
        res.status(500).json({ error: "Error handling webhook" });
    }
});
exports.handleWebhook = handleWebhook;
const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
const handleReaction = (message, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
    const { reaction } = message;
    const emoji = reaction.emoji;
    const messageIdReactedTo = reaction.message_id;
    const originalMessage = yield MessageModel_1.default.findOne({ messageId: messageIdReactedTo });
    if (!originalMessage) {
        console.error(`Mensaje original con ID ${messageIdReactedTo} no encontrado.`);
        return;
    }
    const reactionData = {
        reaction: emoji,
        user: message.from,
        timestamp: new Date(parseInt(timestamp) * 1000),
    };
    originalMessage.reactions = originalMessage.reactions || [];
    originalMessage.reactions.push(reactionData);
    yield originalMessage.save();
});
