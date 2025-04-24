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
exports.importDeals = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const DealsFieldsValuesModel_1 = __importDefault(require("../../models/DealsFieldsValuesModel"));
const DealsFieldsModel_1 = __importDefault(require("../../models/DealsFieldsModel"));
const StatusModel_1 = __importDefault(require("../../models/StatusModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel")); // Importa el modelo de Contact
const importDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Consulta inicial de todos los fields del pipeline
        const pipelineId = data[1][headers.indexOf("pipeline")]; // Ejemplo de cómo obtener el pipelineId
        const fieldsDict = {};
        const pipelineFields = yield DealsFieldsModel_1.default.find({
            pipeline: pipelineId,
        }).exec();
        pipelineFields.forEach((field) => {
            fieldsDict[field.key] = field._id;
        });
        const excelDateToJSDate = (excelDate) => {
            const startDate = new Date(1899, 11, 30); // Excel's epoch starts on 30th December 1899
            const days = Math.floor(excelDate);
            const ms = (excelDate - days) * 86400 * 1000;
            const date = new Date(startDate.getTime() + days * 86400 * 1000 + ms);
            return date;
        };
        const deals = yield Promise.all(data.slice(1).map((row) => __awaiter(void 0, void 0, void 0, function* () {
            const dealData = {
                title: "",
                amount: 0,
                closingDate: new Date(), // Valor por defecto
                pipeline: pipelineId,
                status: null,
                organizationId,
                associatedContactId: null,
            };
            const fieldsValues = [];
            let firstName = "";
            let lastName = "";
            for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                const value = row[i] || "";
                const mappedKey = mapping[header];
                if (mappedKey === "ignore" || !mappedKey)
                    continue;
                if (mappedKey === "status") {
                    console.log(mappedKey);
                    const status = yield StatusModel_1.default.findOne({ name: value }, organizationId).exec();
                    if (status) {
                        dealData.status = status._id;
                    }
                    else {
                        console.warn(`Status no encontrado: ${value}`);
                    }
                }
                else if (mappedKey === "firstName") {
                    firstName = value;
                }
                else if (mappedKey === "lastName") {
                    lastName = value;
                }
                else if (mappedKey === "closingDate") {
                    // Convertir el valor numérico de Excel a una fecha JavaScript
                    const closingDate = excelDateToJSDate(Number(value));
                    if (!isNaN(closingDate.getTime())) {
                        dealData.closingDate = closingDate;
                    }
                    else {
                        console.warn(`Fecha inválida para closingDate: ${value}`);
                    }
                }
                else if (mappedKey in dealData) {
                    dealData[mappedKey] = value;
                }
                else if (fieldsDict[mappedKey]) {
                    fieldsValues.push({
                        field: fieldsDict[mappedKey],
                        value,
                    });
                }
                else {
                    console.warn(`Campo personalizado no encontrado: ${mappedKey}`);
                }
            }
            // Buscar el contacto usando firstName y lastName
            if (firstName && lastName) {
                const contact = yield ContactModel_1.default.findOne({
                    organizationId,
                    $and: [
                        { "properties.key": "firstName", "properties.value": firstName },
                        { "properties.key": "lastName", "properties.value": lastName },
                    ],
                }).exec();
                if (contact) {
                    dealData.associatedContactId = contact._id;
                }
                else {
                    dealData.associatedContactId = null;
                    console.warn(`Contacto no encontrado: ${firstName} ${lastName}`);
                }
            }
            if (!dealData.title ||
                !dealData.amount ||
                isNaN(dealData.closingDate.getTime())) {
                console.warn(`Datos faltantes o inválidos para el deal en fila: ${row}`);
                return null; // No procesar este deal
            }
            const newDeal = yield DealsModel_1.default.create(dealData);
            if (fieldsValues.length > 0) {
                const dealFieldsValues = fieldsValues.map((fieldValue) => ({
                    deal: newDeal._id,
                    field: fieldValue.field,
                    value: fieldValue.value,
                }));
                yield DealsFieldsValuesModel_1.default.insertMany(dealFieldsValues);
            }
            return newDeal;
        })));
        res.status(201).json({
            message: "Deals importados exitosamente",
            importedCount: deals.filter(Boolean).length, // Filtra nulls
        });
    }
    catch (error) {
        console.error("Error al importar deals:", error);
        res
            .status(500)
            .json({ message: "Error interno del servidor", error: error.message });
    }
});
exports.importDeals = importDeals;
