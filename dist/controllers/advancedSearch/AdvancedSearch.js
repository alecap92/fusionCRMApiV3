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
exports.advancedSearch = void 0;
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const advancedSearch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { limit = 20, page = 1 } = req.query;
        const search = req.body.searchParams;
        const searchData = String(search || "").trim();
        if (searchData.length < 3) {
            return res.status(400).json({
                message: "El término de búsqueda debe tener al menos 3 caracteres",
            });
        }
        const cleanSearch = searchData.replace(/[\s\(\)\-\+\.]/g, "");
        const regex = new RegExp(cleanSearch, "i");
        const regexRaw = new RegExp(searchData, "i");
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const pageNumber = Math.max(1, parseInt(page, 10));
        // Buscar contactos
        const contacts = yield ContactModel_1.default.find({
            organizationId,
            $or: [
                {
                    "properties.key": "firstName",
                    "properties.value": { $regex: regexRaw },
                },
                {
                    "properties.key": "lastName",
                    "properties.value": { $regex: regexRaw },
                },
                { "properties.key": "mobile", "properties.value": { $regex: regex } },
                { "properties.key": "phone", "properties.value": { $regex: regex } },
                {
                    "properties.key": "companyName",
                    "properties.value": { $regex: regexRaw },
                },
            ],
        })
            .limit(limitNumber)
            .skip((pageNumber - 1) * limitNumber)
            .exec();
        // Buscar deals con filtrado correcto
        const deals = yield DealsModel_1.default.find({
            organizationId,
            title: { $regex: regexRaw },
        });
        return res.status(200).json({ contacts, deals });
    }
    catch (error) {
        console.error("Error en advancedSearch:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.advancedSearch = advancedSearch;
