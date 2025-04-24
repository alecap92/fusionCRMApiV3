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
exports.deleteFormResponses = exports.deleteForm = exports.submitFormResponse = exports.createForm = exports.getForm = exports.getForms = void 0;
const FormsModel_1 = require("../../models/FormsModel");
const FormResponse_1 = require("../../models/FormResponse");
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const getForms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res
                .status(403)
                .json({ message: "No tienes permiso para realizar esta acción" });
        }
        const forms = yield FormsModel_1.FormModel.find({ organizationId })
            .populate("userId")
            .populate("organizationId");
        return res.status(200).json(forms);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener los formularios", error });
    }
});
exports.getForms = getForms;
const getForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId } = req.params;
        const formResponses = yield FormResponse_1.FormResponseModel.find({
            formId: formId,
        }).populate("formId");
        if (!formResponses) {
            return res.status(404).json({ message: "Formulario no encontrado" });
        }
        return res.status(200).json(formResponses);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener el formulario", error });
    }
});
exports.getForm = getForm;
// Crear un nuevo formulario
const createForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res
                .status(403)
                .json({ message: "No tienes permiso para realizar esta acción" });
        }
        const { name, fields, createContact } = req.body;
        const newForm = new FormsModel_1.FormModel({
            organizationId,
            userId,
            name,
            fields,
            createContact,
        });
        yield newForm.save();
        return res.status(201).json({
            message: "Formulario creado exitosamente",
            formId: newForm._id,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }
});
exports.createForm = createForm;
// Recibir una respuesta de un formulario
let unreadFormCount = 0;
const submitFormResponse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId } = req.params;
        console.log("formId", formId);
        // Buscar el formulario por ID
        const form = yield FormsModel_1.FormModel.findOne({ _id: formId });
        const token = req.query.token;
        if (!token) {
            return res.status(403).json({ message: "Token de seguridad faltante" });
        }
        if (!form) {
            return res.status(404).json({ message: "Formulario no encontrado" });
        }
        // Validar el token
        const tokenShouldBe = form.organizationId.toString();
        if (token !== tokenShouldBe) {
            return res.status(403).json({ message: "Token de seguridad inválido" });
        }
        // Validar que haya datos en el body
        if (!req.body || Object.keys(req.body).length === 0) {
            return res
                .status(400)
                .json({ message: "El cuerpo de la solicitud está vacío" });
        }
        // Procesar los datos entrantes y mapearlos a los campos definidos en el formulario
        const processedResponses = {};
        form.fields.forEach((field) => {
            const fieldName = field.fieldName;
            // Intentamos buscar el valor en las posibles estructuras
            const value = req.body[fieldName] || // JSON
                req.body[`fields[${fieldName}][value]`] || // Elementor Forms estilo
                req.body[`fields.${fieldName}.value`]; // Posible otra estructura
            if (value !== undefined) {
                processedResponses[fieldName] = value;
            }
            else if (field.required) {
                return res
                    .status(400)
                    .json({ message: `Campo ${fieldName} es requerido.` });
            }
        });
        const { organizationId, userId } = form;
        if (!processedResponses) {
            return res
                .status(400)
                .json({ message: "No se han proporcionado respuestas válidas" });
        }
        const newResponse = new FormResponse_1.FormResponseModel({
            formId,
            organizationId,
            userId,
            responses: processedResponses, // Guardar solo los datos procesados
        });
        yield newResponse.save();
        // Almacenar el contacto si savecontact es true
        if (form.createContact) {
            console.log(processedResponses);
            try {
                // Convertir processedResponses al formato que espera properties
                const properties = Object.entries(processedResponses).map(([key, value]) => ({
                    key,
                    value,
                }));
                const contact = new ContactModel_1.default({
                    organizationId,
                    EmployeeOwner: userId,
                    properties, // Se pasa el array transformado
                });
                yield contact.save();
            }
            catch (error) {
                console.log(error);
            }
        }
        // Emitir una notificación para indicar que se ha recibido un nuevo formulario
        // emitNewNotification("form", organizationId, 1, form.name);
        return res
            .status(200)
            .json({ message: "Respuesta del formulario recibida exitosamente" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al recibir la respuesta", error });
    }
});
exports.submitFormResponse = submitFormResponse;
const deleteForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId } = req.params;
        const form = yield FormsModel_1.FormModel.find({ _id: formId });
        if (!form) {
            return res.status(404).json({ message: "Formulario no encontrado" });
        }
        yield FormsModel_1.FormModel.deleteOne({ _id: formId });
        return res
            .status(200)
            .json({ message: "Formulario eliminado exitosamente" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al eliminar el formulario", error });
    }
});
exports.deleteForm = deleteForm;
const deleteFormResponses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { responseIds } = req.body;
        if (!Array.isArray(responseIds) || responseIds.length === 0) {
            return res
                .status(400)
                .json({ message: "No se han proporcionado IDs válidos" });
        }
        const responses = yield FormResponse_1.FormResponseModel.find({
            _id: { $in: responseIds },
        });
        if (responses.length === 0) {
            return res.status(404).json({ message: "Respuestas no encontradas" });
        }
        yield FormResponse_1.FormResponseModel.deleteMany({ _id: { $in: responseIds } });
        return res
            .status(200)
            .json({ message: "Respuestas eliminadas correctamente" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al eliminar las respuestas", error });
    }
});
exports.deleteFormResponses = deleteFormResponses;
