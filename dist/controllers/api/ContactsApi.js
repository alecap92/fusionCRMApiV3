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
exports.createContact = exports.searchContactByPhone = void 0;
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const searchContactByPhone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { organizationId } = req.query;
        const { phone } = req.query;
        // Validar parámetros requeridos
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                error: "Organization ID is required",
            });
        }
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Phone number is required",
            });
        }
        // Normalizar el número de teléfono (remover espacios y caracteres especiales)
        const normalizedPhone = String(phone).trim();
        if (normalizedPhone.length < 3) {
            return res.status(400).json({
                success: false,
                error: "Phone number must have at least 3 characters",
            });
        }
        console.log(`[API] Buscando contacto por teléfono: ${normalizedPhone} en organización: ${organizationId}`);
        // Buscar contacto por número de teléfono
        const contact = yield ContactModel_1.default.findOne({
            organizationId,
            $or: [
                {
                    "properties.key": "mobile",
                    "properties.value": normalizedPhone,
                },
                {
                    "properties.key": "phone",
                    "properties.value": normalizedPhone,
                },
                // Búsqueda parcial para números con formato diferente
                {
                    "properties.key": "mobile",
                    "properties.value": { $regex: normalizedPhone.replace(/\D/g, "") },
                },
                {
                    "properties.key": "phone",
                    "properties.value": { $regex: normalizedPhone.replace(/\D/g, "") },
                },
            ],
        })
            .lean()
            .exec();
        if (!contact) {
            console.log(`[API] Contacto no encontrado para teléfono: ${normalizedPhone}`);
            return res.status(404).json({
                success: false,
                error: "Contact not found",
                message: `No contact found with phone number: ${normalizedPhone}`,
            });
        }
        console.log(`[API] Contacto encontrado: ${contact._id}`);
        // Procesar las propiedades del contacto para facilitar el acceso
        const contactProperties = {};
        (_a = contact.properties) === null || _a === void 0 ? void 0 : _a.forEach((prop) => {
            contactProperties[prop.key] = prop.value;
        });
        // Estructura de respuesta optimizada
        const contactResponse = {
            id: contact._id,
            organizationId: contact.organizationId,
            properties: contactProperties,
            firstName: contactProperties.firstName || "",
            lastName: contactProperties.lastName || "",
            fullName: `${contactProperties.firstName || ""} ${contactProperties.lastName || ""}`.trim(),
            email: contactProperties.email || "",
            mobile: contactProperties.mobile || "",
            phone: contactProperties.phone || "",
            company: contactProperties.companyName || "",
            position: contactProperties.position || "",
            leadScore: contact.leadScore || 0,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        };
        return res.status(200).json({
            success: true,
            contact: contactResponse,
        });
    }
    catch (error) {
        console.error("Error searching contact by phone:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: error.message,
        });
    }
});
exports.searchContactByPhone = searchContactByPhone;
const createContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const organizationId = req.query.organizationId;
        const body = req.body;
        console.log(body, organizationId);
        if (!body.whatsapp_phone) {
            return res.status(400).json({ error: "Whatsapp phone is required" });
        }
        // debemos verificar si el contacto ya existe
        const contactExists = yield ContactModel_1.default.findOne({
            organizationId: organizationId,
            "properties.key": "mobile",
            "properties.value": body.whatsapp_phone,
        });
        if (contactExists) {
            return res.status(200).json(contactExists);
        }
        const createContact = {
            organizationId: organizationId,
            properties: [
                {
                    key: "firstName",
                    value: body.first_name || "",
                    isVisible: true,
                },
                {
                    key: "email",
                    value: body.email || "",
                    isVisible: true,
                },
                {
                    key: "mobile",
                    value: body.whatsapp_phone || "",
                    isVisible: true,
                },
                {
                    key: "city",
                    value: ((_a = body.custom_fields) === null || _a === void 0 ? void 0 : _a.Ciudad) || "",
                    isVisible: true,
                },
                {
                    key: "source",
                    value: body.source || "",
                    isVisible: true,
                },
                {
                    key: "companyName",
                    value: ((_b = body.custom_fields) === null || _b === void 0 ? void 0 : _b.Empresa) || "",
                    isVisible: true,
                },
                {
                    key: "idNumber",
                    value: ((_c = body.custom_fields) === null || _c === void 0 ? void 0 : _c.Nit) || "",
                    isVisible: true,
                },
            ],
        };
        if (!organizationId) {
            return res.status(400).json({ error: "Organization ID is required" });
        }
        const contact = yield ContactModel_1.default.create(createContact);
        res.status(201).json(contact);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createContact = createContact;
