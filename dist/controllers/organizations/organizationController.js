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
exports.uploadLogo = exports.searchOrganization = exports.deleteOrganization = exports.updateOrganization = exports.getOrganizationById = exports.createOrganization = exports.getOrganization = void 0;
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const cloudinary = require("../../config/cloudinaryConfig");
// Obtener todas las organizaciones
const getOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizations = yield OrganizationModel_1.default.find().exec();
        res.status(200).json({ organizations });
    }
    catch (error) {
        console.error("Error obteniendo las organizaciones:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getOrganization = getOrganization;
// Crear una organización
const createOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organization = new OrganizationModel_1.default(req.body);
        yield organization.save();
        res
            .status(201)
            .json({ message: "Organización creada correctamente", organization });
    }
    catch (error) {
        console.error("Error creando la organización:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.createOrganization = createOrganization;
// Obtener una organización por ID
const getOrganizationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const organization = yield OrganizationModel_1.default.findById(organizationId)
            .populate("employees")
            .exec();
        if (!organization) {
            res.status(404).json({ message: "Organización no encontrada" });
            return;
        }
        res.status(200).json(organization);
    }
    catch (error) {
        console.error("Error obteniendo la organización:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getOrganizationById = getOrganizationById;
// Actualizar una organización
const updateOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    console.log(req.body);
    try {
        const updatedOrganization = yield OrganizationModel_1.default.findByIdAndUpdate(organizationId, req.body, { new: true });
        if (!updatedOrganization) {
            res.status(404).json({ message: "Organización no encontrada" });
            return;
        }
        res
            .status(200)
            .json({ message: "Organización actualizada", updatedOrganization });
    }
    catch (error) {
        console.error("Error actualizando la organización:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.updateOrganization = updateOrganization;
// Eliminar una organización
const deleteOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const deletedOrganization = yield OrganizationModel_1.default.findByIdAndDelete(id).exec();
        if (!deletedOrganization) {
            res.status(404).json({ message: "Organización no encontrada" });
            return;
        }
        res.status(200).json({ message: "Organización eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando la organización:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deleteOrganization = deleteOrganization;
// Buscar organizaciones
const searchOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    try {
        const organizations = yield OrganizationModel_1.default.find({
            name: { $regex: query, $options: "i" },
        }).exec();
        res.status(200).json(organizations);
    }
    catch (error) {
        console.error("Error buscando organizaciones:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.searchOrganization = searchOrganization;
const uploadLogo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res
                .status(400)
                .json({ error: "No se proporcionó el ID de la organización" });
        }
        if (!req.file) {
            return res
                .status(400)
                .json({ error: "No se proporcionó un archivo para subir" });
        }
        // Subir el archivo a Cloudinary usando el buffer
        const result = yield new Promise((resolve, reject) => {
            var _a;
            const uploadStream = cloudinary.uploader.upload_stream({ folder: "organization_logos" }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            uploadStream.end((_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer);
        });
        const updatedOrganization = yield OrganizationModel_1.default.findByIdAndUpdate({ _id: organizationId }, { logoUrl: result.secure_url }, { new: true });
        return res.status(200).json({
            message: "Logo actualizado con éxito",
            logoUrl: result.secure_url,
            organization: updatedOrganization,
        });
    }
    catch (error) {
        console.error("Error al subir el logo:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});
exports.uploadLogo = uploadLogo;
