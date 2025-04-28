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
exports.analyseContact = void 0;
const openAiService_1 = require("../../services/openAiService");
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const ActivityModel_1 = __importDefault(require("../../models/ActivityModel"));
const analyseContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("analiseContact");
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const contactId = req.params.id;
        if (!organizationId) {
            return res.status(401).json({
                message: "No se proporcionó un ID de organización",
            });
        }
        if (!contactId) {
            return res.status(400).json({
                message: "No se proporcionó un ID de contacto",
            });
        }
        // Get contact details
        const contact = yield ContactModel_1.default.findById(contactId);
        if (!contact) {
            return res.status(404).json({
                message: "Contacto no encontrado",
            });
        }
        // Get contact deals - ordenados por fecha de cierre (del más reciente al más antiguo)
        const deals = yield DealsModel_1.default.find({
            associatedContactId: contactId,
        }).sort({ closingDate: -1 });
        // Get contact activities - ordenadas por fecha (más recientes primero)
        const activities = yield ActivityModel_1.default.find({ contactId: contactId }).sort({
            createdAt: -1,
        });
        // Obtener análisis del contacto
        const analysisResult = yield (0, openAiService_1.analyseContactDetails)(contactId, organizationId, {
            details: contact,
            deals,
            activities,
        });
        return res.status(200).json({
            message: "Contacto analizado correctamente",
            analysis: analysisResult,
        });
    }
    catch (error) {
        console.error("Error al analizar contacto:", error);
        return res.status(500).json({
            message: "Error al analizar el contacto",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
exports.analyseContact = analyseContact;
