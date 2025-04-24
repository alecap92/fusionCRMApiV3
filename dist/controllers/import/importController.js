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
exports.importContacts = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const importContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;
    if (!userId || !organizationId) {
        return res
            .status(400)
            .json({ message: "Usuario o organización no encontrado" });
    }
    if (!req.file) {
        return res
            .status(400)
            .json({ message: "No se ha proporcionado un archivo" });
    }
    if (!mapping) {
        return res
            .status(400)
            .json({ message: "No se ha proporcionado un mapeo de propiedades" });
    }
    try {
        const workbook = xlsx_1.default.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length < 2) {
            return res
                .status(400)
                .json({ message: "El archivo no contiene suficientes datos" });
        }
        const headers = data[0];
        const contacts = data.slice(1).map((row) => {
            const properties = headers
                .map((header, index) => {
                const mappedKey = mapping[header];
                if (!mappedKey) {
                    return null;
                }
                let value = row[index];
                // Si el valor es undefined o nulo, asignar una cadena vacía
                if (value === undefined || value === null) {
                    value = "";
                }
                if (mappedKey === "ignore") {
                    return null;
                }
                if (mappedKey.startsWith("create:")) {
                    const newProperty = mappedKey.split(":")[1];
                    return {
                        key: newProperty,
                        value: value,
                        isVisible: true,
                    };
                }
                return {
                    key: mappedKey,
                    value: value,
                    isVisible: true,
                };
            })
                .filter((property) => property !== null);
            return {
                properties,
                EmployeeOwner: [userId],
                source: "imported",
                organizationId,
            };
        });
        // Procesar en lotes
        const batchSize = 1000;
        for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            yield ContactModel_1.default.insertMany(batch);
        }
        res.status(201).json({
            message: "Contactos importados exitosamente",
            importedCount: contacts.length,
        });
    }
    catch (error) {
        console.error("Error al importar contactos:", error);
        res
            .status(500)
            .json({ message: "Error interno del servidor", error: error.message });
    }
});
exports.importContacts = importContacts;
