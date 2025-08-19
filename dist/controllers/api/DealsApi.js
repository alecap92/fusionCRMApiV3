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
/*
Creacion de negocios desde ManyChat.


TODO:
- Necesito agregar al contacto companyType, el Nit
-

*/
const createDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { title, amount, contact } = req.body;
        const { pipeline, status, organizationId } = req.query;
        // Validación básica
        if (!title || !amount || !(contact === null || contact === void 0 ? void 0 : contact.mobile) || !organizationId) {
            return res.status(400).json({ message: "Faltan datos obligatorios" });
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
            // Construcción de propiedades sin `isVisible`
            const properties = [
                { key: "firstName", value: ((_a = contact.name) === null || _a === void 0 ? void 0 : _a.trim()) || "" },
                { key: "mobile", value: ((_b = contact.mobile) === null || _b === void 0 ? void 0 : _b.trim()) || "" },
                { key: "phone", value: ((_c = contact.phone) === null || _c === void 0 ? void 0 : _c.trim()) || "" }, // Si el teléfono fijo es opcional
                { key: "email", value: ((_d = contact.email) === null || _d === void 0 ? void 0 : _d.trim()) || "" },
                { key: "city", value: ((_e = contact.ciudad) === null || _e === void 0 ? void 0 : _e.trim()) || "" },
                { key: "state", value: ((_f = contact.estado) === null || _f === void 0 ? void 0 : _f.trim()) || "" }, // Si "state" es un campo requerido
                { key: "address", value: ((_g = contact.direccion) === null || _g === void 0 ? void 0 : _g.trim()) || "" },
                { key: "companyName", value: ((_h = contact.empresa) === null || _h === void 0 ? void 0 : _h.trim()) || "" },
                { key: "companyType", value: ((_j = contact.companyType) === null || _j === void 0 ? void 0 : _j.trim()) || "" },
                { key: "idNumber", value: ((_k = contact.id) === null || _k === void 0 ? void 0 : _k.trim()) || "" },
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
            amount,
            closingDate: new Date(),
            pipeline,
            status,
            organizationId,
            associatedContactId,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        res.status(201).json(newDeal);
    }
    catch (error) {
        console.error("Error creating deal:", error);
        res
            .status(500)
            .json({ message: "Error interno del servidor", error: error.message });
    }
});
exports.createDeal = createDeal;
