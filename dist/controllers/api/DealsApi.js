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
exports.createDeal = void 0;
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const PipelinesModel_1 = __importDefault(require("../../models/PipelinesModel"));
const StatusModel_1 = __importDefault(require("../../models/StatusModel"));
const DealsFieldsModel_1 = __importDefault(require("../../models/DealsFieldsModel"));
const DealsFieldsValuesModel_1 = __importDefault(require("../../models/DealsFieldsValuesModel"));
const createDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { title, amount, contact, customFields } = req.body;
        const { pipeline, status, organizationId } = req.query;
        console.log(req.body);
        console.log(req.query);
        // Validación básica
        if (!title || !amount || !(contact === null || contact === void 0 ? void 0 : contact.mobile) || !organizationId) {
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                required: ["title", "amount", "contact.mobile", "organizationId"],
            });
        }
        // Validar que amount sea un número
        if (isNaN(Number(amount))) {
            return res.status(400).json({
                message: "El campo 'amount' debe ser un número válido",
            });
        }
        // Validar que pipeline existe y pertenece a la organización
        if (pipeline) {
            const pipelineExists = yield PipelinesModel_1.default.findOne({
                _id: pipeline,
                organizationId: organizationId,
            });
            if (!pipelineExists) {
                return res.status(400).json({
                    message: "Pipeline no encontrado o no pertenece a la organización",
                });
            }
        }
        // Validar que status existe y pertenece al pipeline
        if (status && pipeline) {
            const statusExists = yield StatusModel_1.default.findOne({
                _id: status,
                pipeline: pipeline,
                organizationId: organizationId,
            });
            if (!statusExists) {
                return res.status(400).json({
                    message: "Status no encontrado o no pertenece al pipeline",
                });
            }
        }
        // Validar campos personalizados si se proporcionan
        if (customFields && pipeline) {
            // Obtener todos los campos disponibles para este pipeline
            const availableFields = yield DealsFieldsModel_1.default.find({
                pipeline: pipeline,
            });
            // Validar que todos los campos personalizados enviados existan en el pipeline
            for (const customField of customFields) {
                const fieldExists = availableFields.find((field) => { var _a; return ((_a = field._id) === null || _a === void 0 ? void 0 : _a.toString()) === customField.field; });
                if (!fieldExists) {
                    return res.status(400).json({
                        message: `Campo personalizado '${customField.field}' no existe en este pipeline`,
                    });
                }
                // Validar campos requeridos
                if (fieldExists.required &&
                    (!customField.value || customField.value.trim() === "")) {
                    return res.status(400).json({
                        message: `El campo '${fieldExists.name}' es obligatorio`,
                    });
                }
            }
        }
        let associatedContactId;
        // Buscar si ya existe un contacto con ese número de móvil en la organización
        const contactExists = yield ContactModel_1.default.findOne({
            organizationId: organizationId,
            "properties.key": "mobile",
            "properties.value": contact.mobile.trim(),
        });
        if (contactExists) {
            associatedContactId = contactExists._id;
        }
        else {
            // Construcción de propiedades CON isVisible (corregido)
            const properties = [
                {
                    key: "firstName",
                    value: ((_a = contact.name) === null || _a === void 0 ? void 0 : _a.trim()) || "",
                    isVisible: true,
                },
                { key: "mobile", value: ((_b = contact.mobile) === null || _b === void 0 ? void 0 : _b.trim()) || "", isVisible: true },
                { key: "phone", value: ((_c = contact.phone) === null || _c === void 0 ? void 0 : _c.trim()) || "", isVisible: true },
                { key: "email", value: ((_d = contact.email) === null || _d === void 0 ? void 0 : _d.trim()) || "", isVisible: false },
                { key: "city", value: ((_e = contact.ciudad) === null || _e === void 0 ? void 0 : _e.trim()) || "", isVisible: false },
                { key: "state", value: ((_f = contact.estado) === null || _f === void 0 ? void 0 : _f.trim()) || "", isVisible: false },
                {
                    key: "address",
                    value: ((_g = contact.direccion) === null || _g === void 0 ? void 0 : _g.trim()) || "",
                    isVisible: false,
                },
                {
                    key: "companyName",
                    value: ((_h = contact.empresa) === null || _h === void 0 ? void 0 : _h.trim()) || "",
                    isVisible: false,
                },
                {
                    key: "companyType",
                    value: ((_j = contact.companyType) === null || _j === void 0 ? void 0 : _j.trim()) || "",
                    isVisible: false,
                },
                { key: "idNumber", value: ((_k = contact.id) === null || _k === void 0 ? void 0 : _k.trim()) || "", isVisible: false },
            ].filter((prop) => prop.value !== ""); // Eliminar claves con valores vacíos
            // Crear el contacto si no existe
            const newContact = yield ContactModel_1.default.create({
                organizationId: organizationId,
                properties,
            });
            associatedContactId = newContact._id;
        }
        // Crear el negocio (deal)
        const newDeal = yield DealsModel_1.default.create({
            title,
            amount: Number(amount), // Asegurar que sea número
            closingDate: new Date(),
            pipeline,
            status: status || null,
            organizationId,
            associatedContactId,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        // Procesar campos personalizados si se proporcionan
        if (customFields && customFields.length > 0) {
            const dealFields = customFields
                .filter((field) => field.value && field.value.trim() !== "")
                .map((field) => ({
                deal: newDeal._id,
                field: field.field,
                value: field.value.trim(),
            }));
            if (dealFields.length > 0) {
                yield DealsFieldsValuesModel_1.default.insertMany(dealFields);
            }
        }
        res.status(201).json({
            success: true,
            data: newDeal,
            message: "Deal creado exitosamente",
        });
    }
    catch (error) {
        console.error("Error creating deal:", error);
        // Manejo de errores específicos de MongoDB
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Error de validación",
                errors: Object.values(error.errors).map((err) => err.message),
            });
        }
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Formato de datos inválido",
                field: error.path,
                value: error.value,
            });
        }
        res.status(500).json({
            message: "Error interno del servidor",
            error: error.message,
        });
    }
});
exports.createDeal = createDeal;
