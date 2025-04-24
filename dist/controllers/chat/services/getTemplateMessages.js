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
exports.getTemplatesMessages = void 0;
const axios_1 = __importDefault(require("axios"));
const OrganizationModel_1 = __importDefault(require("../../../models/OrganizationModel"));
const getTemplatesMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
    }
    const { organizationId } = req.user;
    const organization = yield OrganizationModel_1.default.findById(organizationId);
    try {
        const response = yield axios_1.default.get(`${process.env.WHATSAPP_API_URL}/${organization === null || organization === void 0 ? void 0 : organization.settings.whatsapp.whatsAppBusinessAccountID}/message_templates`, {
            headers: {
                Authorization: `Bearer ${organization === null || organization === void 0 ? void 0 : organization.settings.whatsapp.accessToken}`,
            },
        });
        res.status(200).json(response.data);
    }
    catch (error) {
        console.log(error);
        console.error("Error obteniendo las plantillas:", error.message);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Error desconocido",
        });
        return undefined;
    }
});
exports.getTemplatesMessages = getTemplatesMessages;
