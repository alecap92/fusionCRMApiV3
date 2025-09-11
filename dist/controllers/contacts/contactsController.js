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
exports.filterContacts = exports.searchContact = exports.updateContact = exports.deleteContactById = exports.deleteContact = exports.createContact = exports.getContacts = exports.getContact = void 0;
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
// Obtener un solo contacto por ID
const getContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const contactId = req.params.id;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const contact = yield ContactModel_1.default.findById(contactId).populate("EmployeeOwner");
        if (!contact) {
            return res.status(404).json({ message: "Contacto no encontrado" });
        }
        const deals = yield DealsModel_1.default.find({ associatedContactId: contactId })
            .populate("status")
            .exec();
        const totalRevenue = deals.reduce((acc, deal) => acc + deal.amount, 0);
        const lastDeal = deals.length > 0
            ? deals.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
            : null;
        return res.status(200).json({
            contact,
            deals,
            notes: [],
            resume: {
                totalRevenue,
                totalDeals: deals.length,
                totalNotes: 0,
                lastDeal,
            },
            conversations: [],
        });
    }
    catch (error) {
        console.error("Error obteniendo el contacto:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getContact = getContact;
// Obtener todos los contactos
const getContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const offset = parseInt(req.query.offset) || 0;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!organizationId) {
            res.status(400).json({ message: "organizationId is required" });
            return;
        }
        const contacts = yield ContactModel_1.default.find({ organizationId })
            .skip((page - 1) * limit + offset)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const total = yield ContactModel_1.default.countDocuments({ organizationId });
        // Calcular totalRevenue por contacto
        const contactIds = contacts.map((c) => c._id);
        let revenueByContact = {};
        if (contactIds.length > 0) {
            const revenueAgg = yield DealsModel_1.default.aggregate([
                { $match: { associatedContactId: { $in: contactIds } } },
                {
                    $group: {
                        _id: "$associatedContactId",
                        totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
                    },
                },
            ]).exec();
            revenueByContact = revenueAgg.reduce((acc, cur) => {
                acc[String(cur._id)] = cur.totalRevenue || 0;
                return acc;
            }, {});
        }
        const contactsWithRevenue = contacts.map((c) => (Object.assign(Object.assign({}, c), { totalRevenue: revenueByContact[String(c._id)] || 0 })));
        res.status(200).json({
            data: contactsWithRevenue,
            total,
        });
    }
    catch (error) {
        console.error("Error obteniendo los contactos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getContacts = getContacts;
// Crear un nuevo contacto
const createContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const parsedProperties = Object.entries(req.body).map(([key, value]) => ({
            key,
            value,
        }));
        const newContact = new ContactModel_1.default({
            properties: parsedProperties,
            organizationId,
            EmployeeOwner: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
        });
        yield newContact.save();
        res.status(201).json(newContact);
    }
    catch (error) {
        console.error("Error creando el contacto:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.createContact = createContact;
// Eliminar contactos
const deleteContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userIds = req.body.ids;
    try {
        const deletedContacts = yield ContactModel_1.default.deleteMany({ _id: { $in: userIds } });
        res.status(200).json({ message: "Contactos eliminados", deletedContacts });
    }
    catch (error) {
        console.error("Error eliminando los contactos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deleteContact = deleteContact;
// Eliminar un contacto individual
const deleteContactById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const contactId = req.params.id;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        return res.status(401).json({ message: "No autorizado" });
    }
    try {
        const deletedContact = yield ContactModel_1.default.findOneAndDelete({
            _id: contactId,
            organizationId,
        });
        if (!deletedContact) {
            return res.status(404).json({ message: "Contacto no encontrado" });
        }
        res.status(200).json({
            message: "Contacto eliminado correctamente",
            deletedContact,
        });
    }
    catch (error) {
        console.error("Error eliminando el contacto:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deleteContactById = deleteContactById;
// Actualizar un contacto
const updateContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const contactId = req.params.id;
    const form = req.body;
    console.log(req.body);
    try {
        const updatedContact = yield ContactModel_1.default.findByIdAndUpdate(contactId, form, {
            new: true,
        }).exec();
        if (!updatedContact) {
            res.status(404).json({ message: "Contacto no encontrado" });
            return;
        }
        res.status(200).json({ message: "Contacto actualizado", updatedContact });
    }
    catch (error) {
        console.error("Error actualizando el contacto:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.updateContact = updateContact;
const searchContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { search, limit = 20, page = 1 } = req.query;
        if (!organizationId || !search) {
            res.status(400).json({ message: "Faltan parámetros" });
            return;
        }
        // Normalizar el valor de búsqueda eliminando caracteres no numéricos
        if (typeof search !== "string" || search.length < 3) {
            res.status(400).json({
                message: "El término de búsqueda debe tener al menos 3 caracteres",
            });
            return;
        }
        // Crear una expresión regular a partir del valor normalizado
        // Convertir limit y page a números enteros
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const pageNumber = Math.max(1, parseInt(page, 10));
        const contacts = yield ContactModel_1.default.find({
            organizationId,
            $or: [
                {
                    "properties.key": "firstName",
                    "properties.value": { $regex: search },
                },
                {
                    "properties.key": "lastName",
                    "properties.value": { $regex: search },
                },
                {
                    "properties.key": "mobile",
                    "properties.value": { $regex: search },
                },
                {
                    "properties.key": "phone",
                    "properties.value": { $regex: search },
                },
                {
                    "properties.key": "companyType",
                    "properties.value": { $regex: search },
                },
                {
                    "properties.key": "companyName",
                    "properties.value": { $regex: search },
                },
            ],
        })
            .limit(limitNumber)
            .skip((pageNumber - 1) * limitNumber)
            .lean()
            .exec();
        // Calcular totalRevenue por contacto en resultados de búsqueda
        const contactIds = contacts.map((c) => c._id);
        let revenueByContact = {};
        if (contactIds.length > 0) {
            const revenueAgg = yield DealsModel_1.default.aggregate([
                { $match: { associatedContactId: { $in: contactIds } } },
                {
                    $group: {
                        _id: "$associatedContactId",
                        totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
                    },
                },
            ]).exec();
            revenueByContact = revenueAgg.reduce((acc, cur) => {
                acc[String(cur._id)] = cur.totalRevenue || 0;
                return acc;
            }, {});
        }
        const contactsWithRevenue = contacts.map((c) => (Object.assign(Object.assign({}, c), { totalRevenue: revenueByContact[String(c._id)] || 0 })));
        res.status(200).json(contactsWithRevenue);
    }
    catch (error) {
        console.error("Error buscando contactos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.searchContact = searchContact;
const filterContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const filters = req.body;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        if (!organizationId || !filters) {
            return res.status(400).json({ message: "Missing required parameters" });
        }
        const filterConditions = filters.map((filter) => {
            let valueCondition;
            switch (filter.operator) {
                case "contains":
                    valueCondition = { $regex: filter.value, $options: "i" };
                    break;
                case "equals":
                    valueCondition = filter.value;
                    break;
                case "starts with":
                    valueCondition = { $regex: `^${filter.value}`, $options: "i" };
                    break;
                case "ends with":
                    valueCondition = { $regex: `${filter.value}$`, $options: "i" };
                    break;
                case "is empty":
                    valueCondition = { $in: ["", null] };
                    break;
                case "is not empty":
                    valueCondition = { $nin: ["", null] };
                    break;
                default:
                    valueCondition = { $regex: filter.value, $options: "i" };
            }
            return {
                $and: [
                    { "properties.key": filter.key },
                    { "properties.value": valueCondition },
                ],
            };
        });
        const query = {
            organizationId,
            $and: filterConditions,
        };
        const contacts = yield ContactModel_1.default.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const total = yield ContactModel_1.default.countDocuments(query);
        // Calcular totalRevenue para resultados filtrados
        const contactIds = contacts.map((c) => c._id);
        let revenueByContact = {};
        if (contactIds.length > 0) {
            const revenueAgg = yield DealsModel_1.default.aggregate([
                { $match: { associatedContactId: { $in: contactIds } } },
                {
                    $group: {
                        _id: "$associatedContactId",
                        totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
                    },
                },
            ]).exec();
            revenueByContact = revenueAgg.reduce((acc, cur) => {
                acc[String(cur._id)] = cur.totalRevenue || 0;
                return acc;
            }, {});
        }
        const contactsWithRevenue = contacts.map((c) => (Object.assign(Object.assign({}, c), { totalRevenue: revenueByContact[String(c._id)] || 0 })));
        res.status(200).json({
            data: contactsWithRevenue,
            total,
            page,
            limit,
        });
    }
    catch (error) {
        console.error("Error filtering contacts:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.filterContacts = filterContacts;
