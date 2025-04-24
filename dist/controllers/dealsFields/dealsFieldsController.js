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
exports.editDealField = exports.deleteDealField = exports.getDealFields = exports.createDealsField = void 0;
const DealsFieldsModel_1 = __importDefault(require("../../models/DealsFieldsModel"));
const DealsFieldsValuesModel_1 = __importDefault(require("../../models/DealsFieldsValuesModel"));
// Crear campo de trato
const createDealsField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pipeline, name, key } = req.body;
        if (!pipeline || !name || !key) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }
        const exist = yield DealsFieldsModel_1.default.findOne({ key }).exec();
        if (exist) {
            return res
                .status(400)
                .json({ message: "Ya existe un campo con esa clave" });
        }
        yield DealsFieldsModel_1.default.create({ pipeline, name, key });
        return res.status(201).json({ message: "Campo creado correctamente" });
    }
    catch (error) {
        console.error("Error creando el campo de trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.createDealsField = createDealsField;
// Obtener campos de trato
const getDealFields = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pipelineId } = req.query;
        const fields = yield DealsFieldsModel_1.default.find({ pipeline: pipelineId }).exec();
        return res.status(200).json(fields);
    }
    catch (error) {
        console.error("Error obteniendo los campos de trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getDealFields = getDealFields;
// Eliminar campo de trato
const deleteDealField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield DealsFieldsModel_1.default.findByIdAndDelete(id).exec();
        yield DealsFieldsValuesModel_1.default.deleteMany({ field: id }).exec();
        return res.status(200).json({ message: "Campo eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando el campo de trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deleteDealField = deleteDealField;
// Editar campo de trato
const editDealField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { pipeline, name, key, required } = req.body;
        if (!pipeline || !name || !key) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }
        yield DealsFieldsModel_1.default.findByIdAndUpdate(id, {
            pipeline,
            name,
            key,
            required,
        }).exec();
        return res.status(200).json({ message: "Campo actualizado correctamente" });
    }
    catch (error) {
        console.error("Error actualizando el campo de trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.editDealField = editDealField;
