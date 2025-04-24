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
exports.sendTemplateMessage = void 0;
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const axios_1 = __importDefault(require("axios"));
const MessageModel_1 = __importDefault(require("../../../models/MessageModel"));
const sendTemplateMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const organization = yield OrganizationModel_1.default.findOne({
            _id: organizationId,
        });
        const body = req.body;
        if (!organization) {
            return res.status(400).json({ error: "Organization not found" });
        }
        const whatsappApiUrl = `${process.env.WHATSAPP_API_URL}/${organization.settings.whatsapp.numberIdIdentifier}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            to: body.to,
            type: "template",
            template: {
                name: body.template.name,
                language: body.template.language,
                components: body.template.components,
            },
        };
        const response = yield axios_1.default.post(whatsappApiUrl, payload, {
            headers: {
                Authorization: `Bearer ${organization.settings.whatsapp.accessToken}`,
            },
        });
        // save msg in db
        const outGoingMessage = yield MessageModel_1.default.create({
            organization: organizationId,
            from: organization.settings.whatsapp.phoneNumber,
            to: body.to,
            type: "text",
            direction: "outgoing",
            message: body.message,
            isRead: true,
            user: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
        });
        yield outGoingMessage.save();
        res.status(200).json(response.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error("Axios error details:", {
                message: error.message,
                response: (_c = error.response) === null || _c === void 0 ? void 0 : _c.data,
                status: (_d = error.response) === null || _d === void 0 ? void 0 : _d.status,
                headers: (_e = error.response) === null || _e === void 0 ? void 0 : _e.headers,
            });
            res.status(((_f = error.response) === null || _f === void 0 ? void 0 : _f.status) || 500).json({
                error: ((_g = error.response) === null || _g === void 0 ? void 0 : _g.data) || "Error desconocido",
            });
        }
        else {
            console.error("Unexpected error:", error.message);
            res.status(500).json({
                error: "Error desconocido",
            });
        }
    }
});
exports.sendTemplateMessage = sendTemplateMessage;
