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
exports.createContact = void 0;
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
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
