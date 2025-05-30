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
exports.sendWhatsAppMessage = sendWhatsAppMessage;
const axios_1 = __importDefault(require("axios"));
const apiUrl = process.env.WHATSAPP_API_URL;
function sendWhatsAppMessage(options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const { to, message, accessToken, phoneNumberId } = options;
        try {
            const whatsappApiUrl = `${apiUrl}/${phoneNumberId}/messages`;
            const payload = {
                messaging_product: "whatsapp",
                to,
                text: { body: message },
            };
            const response = yield axios_1.default.post(whatsappApiUrl, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if ((_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.id) {
                return response.data.messages[0].id;
            }
            return null;
        }
        catch (error) {
            console.error("[WhatsAppHelper] Error enviando mensaje:", error);
            throw error;
        }
    });
}
