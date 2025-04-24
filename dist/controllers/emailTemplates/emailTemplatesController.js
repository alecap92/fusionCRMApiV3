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
exports.deleteEmailTemplate = exports.updateEmailTemplate = exports.getEmailTemplateById = exports.getEmailTemplates = exports.createEmailTemplate = void 0;
const EmailTemplates_1 = __importDefault(require("../../models/EmailTemplates"));
// ✅ Crear una nueva plantilla de correo
const createEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log("create");
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const createdBy = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const { name, emailJson, emailHtml } = req.body;
        if (!name || !emailJson || !emailHtml) {
            return res
                .status(400)
                .json({ message: "Todos los campos obligatorios deben ser llenados" });
        }
        const newEmailTemplate = new EmailTemplates_1.default({
            name,
            emailJson,
            emailHtml,
            organizationId,
            createdBy,
            createdAt: new Date(),
        });
        yield newEmailTemplate.save();
        res.status(201).json({
            message: "Plantilla de correo creada exitosamente",
            template: newEmailTemplate,
        });
    }
    catch (error) {
        console.error("Error creando plantilla de correo:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.createEmailTemplate = createEmailTemplate;
// ✅ Obtener todas las plantillas con paginación
const getEmailTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const templates = yield EmailTemplates_1.default.find({ organizationId })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("userId");
        if (!templates) {
            return res
                .status(404)
                .json({ message: "No se encontraron plantillas de correo" });
        }
        const total = yield EmailTemplates_1.default.countDocuments({ organizationId });
        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            templates,
        });
    }
    catch (error) {
        console.error("Error obteniendo plantillas de correo:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.getEmailTemplates = getEmailTemplates;
// ✅ Obtener una plantilla por ID
const getEmailTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const template = yield EmailTemplates_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!template) {
            return res
                .status(404)
                .json({ message: "Plantilla de correo no encontrada" });
        }
        res.status(200).json(template);
    }
    catch (error) {
        console.error("Error obteniendo plantilla de correo:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.getEmailTemplateById = getEmailTemplateById;
// ✅ Actualizar una plantilla de correo
const updateEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const { name, emailJson, emailHtml } = req.body;
        const existingTemplate = yield EmailTemplates_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!existingTemplate) {
            return res
                .status(404)
                .json({ message: "Plantilla de correo no encontrada" });
        }
        existingTemplate.name = name !== null && name !== void 0 ? name : existingTemplate.name;
        existingTemplate.emailJson = emailJson !== null && emailJson !== void 0 ? emailJson : existingTemplate.emailJson;
        existingTemplate.emailHtml = emailHtml !== null && emailHtml !== void 0 ? emailHtml : existingTemplate.emailHtml;
        yield existingTemplate.save();
        res.status(200).json({
            message: "Plantilla de correo actualizada",
            template: existingTemplate,
        });
    }
    catch (error) {
        console.error("Error actualizando plantilla de correo:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.updateEmailTemplate = updateEmailTemplate;
// ✅ Eliminar una plantilla de correo
const deleteEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const deletedTemplate = yield EmailTemplates_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!deletedTemplate) {
            return res
                .status(404)
                .json({ message: "Plantilla de correo no encontrada" });
        }
        res
            .status(200)
            .json({ message: "Plantilla de correo eliminada exitosamente" });
    }
    catch (error) {
        console.error("Error eliminando plantilla de correo:", error);
        res.status(500).json({ message: "Error en el servidor", error });
    }
});
exports.deleteEmailTemplate = deleteEmailTemplate;
