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
exports.getDocumentsByOrganization = exports.deleteDocument = exports.updateDocument = exports.getDocumentById = exports.getAllDocuments = exports.createDocument = void 0;
const DocumentModel_1 = __importDefault(require("../../models/DocumentModel"));
const mongoose_1 = __importDefault(require("mongoose"));
const aws_1 = require("../../config/aws");
const createDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No se ha proporcionado ningún archivo",
            });
        }
        const { name, description, tags, metadata, organizationId, uploadedBy } = req.body;
        console.log(req.body, "uploadedBy");
        if (!uploadedBy || !organizationId) {
            return res.status(400).json({
                message: "No se ha proporcionado el usuario que sube el documento o la organización",
            });
        }
        // Obtener la URL del archivo
        const fileURL = req.file.path || req.file.location || "";
        // Subir el archivo a S3
        const uploadedFile = yield (0, aws_1.subirArchivo)(req.file.buffer, req.file.originalname, req.file.mimetype);
        // Crear el documento
        const newDocument = new DocumentModel_1.default({
            name: name || req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            uploadedBy: uploadedBy,
            fileURL: uploadedFile,
            description,
            tags: tags ? JSON.parse(tags) : [],
            metadata: metadata ? JSON.parse(metadata) : {},
            organizationId: new mongoose_1.default.Types.ObjectId(organizationId),
        });
        const savedDocument = yield newDocument.save();
        res.status(201).json({
            message: "Documento creado correctamente",
            data: savedDocument,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al crear el documento",
            error: error,
        });
    }
});
exports.createDocument = createDocument;
const getAllDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { organizationId, status, type, tags } = req.query;
        const filter = {};
        // Filtrar por organización si se proporciona
        if (organizationId &&
            mongoose_1.default.Types.ObjectId.isValid(organizationId)) {
            filter.organizationId = organizationId;
        }
        else if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId) {
            // Si no se proporciona, usar la organización del usuario
            filter.organizationId = new mongoose_1.default.Types.ObjectId(req.user.organizationId);
        }
        // Filtrar por estado si se proporciona
        if (status) {
            filter.status = status;
        }
        // Filtrar por tipo de documento
        if (type) {
            filter.type = type;
        }
        // Filtrar por tags
        if (tags) {
            filter.tags = { $in: [tags].flat() };
        }
        const documents = yield DocumentModel_1.default.find(filter)
            .populate("uploadedBy", "name email")
            .sort({ uploadDate: -1 });
        res.status(200).json({
            message: "Documentos recuperados correctamente",
            count: documents.length,
            data: documents,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar los documentos",
            error: error,
        });
    }
});
exports.getAllDocuments = getAllDocuments;
const getDocumentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido",
            });
        }
        const document = yield DocumentModel_1.default.findById(id).populate("uploadedBy", "name email");
        if (!document) {
            return res.status(404).json({
                message: "Documento no encontrado",
            });
        }
        res.status(200).json({
            message: "Documento recuperado correctamente",
            data: document,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar el documento",
            error: error,
        });
    }
});
exports.getDocumentById = getDocumentById;
const updateDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, tags, metadata, status } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido",
            });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (description)
            updateData.description = description;
        if (tags)
            updateData.tags = JSON.parse(tags);
        if (metadata)
            updateData.metadata = JSON.parse(metadata);
        if (status)
            updateData.status = status;
        const updatedDocument = yield DocumentModel_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedDocument) {
            return res.status(404).json({
                message: "Documento no encontrado",
            });
        }
        res.status(200).json({
            message: "Documento actualizado correctamente",
            data: updatedDocument,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al actualizar el documento",
            error: error,
        });
    }
});
exports.updateDocument = updateDocument;
const deleteDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido",
            });
        }
        const document = yield DocumentModel_1.default.findByIdAndDelete(id);
        if (!document) {
            return res.status(404).json({
                message: "Documento no encontrado",
            });
        }
        // Aquí deberías también eliminar el archivo físico
        // Ejemplo: fs.unlinkSync(document.fileURL);
        res.status(200).json({
            message: "Documento eliminado correctamente",
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al eliminar el documento",
            error: error,
        });
    }
});
exports.deleteDocument = deleteDocument;
const getDocumentsByOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                message: "ID de organización inválido",
            });
        }
        const documents = yield DocumentModel_1.default.find({
            organizationId,
            status: "active",
        })
            .populate("uploadedBy", "name email")
            .sort({ uploadDate: -1 });
        res.status(200).json({
            message: "Documentos de la organización recuperados correctamente",
            count: documents.length,
            data: documents,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar los documentos de la organización",
            error: error,
        });
    }
});
exports.getDocumentsByOrganization = getDocumentsByOrganization;
