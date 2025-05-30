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
exports.deleteFile = exports.getFiles = exports.uploadFile = void 0;
const FileModel_1 = __importDefault(require("../../models/FileModel"));
const cloudinary = require("../../config/cloudinaryConfig");
// Función auxiliar para subir archivos a Cloudinary
const uploadToCloudinary = (mediaBuffer, resourceType) => {
    return new Promise((resolve, reject) => {
        let options = { resource_type: resourceType };
        console.log(resourceType);
        switch (resourceType) {
            case "image":
                console.log("filetype image");
                options.transformation = [
                    { width: 800, crop: "scale" },
                    { quality: "auto" },
                    { fetch_format: "auto" },
                ];
                break;
            case "video":
                options.transformation = [
                    { quality: "auto" },
                    { fetch_format: "auto" },
                ];
                break;
            case "raw":
                options.transformation = [
                    { quality: "auto" },
                    { fetch_format: "auto" },
                ];
                break;
            case "application":
                options.resource_type = "raw";
                options.format = "pdf";
                break;
            default:
                break;
        }
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result.secure_url);
            }
        });
        uploadStream.end(mediaBuffer);
    });
};
// Subir un archivo a Cloudinary y guardarlo en la base de datos
const uploadFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const isVisible = req.query.isVisible;
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        if (!userId || !organizationId) {
            return res
                .status(400)
                .json({ message: "User or organization not found" });
        }
        const fileBuffer = req.file.buffer;
        const fileType = req.file.mimetype.split("/")[0];
        const mediaURL = yield uploadToCloudinary(fileBuffer, fileType);
        const file = new FileModel_1.default({
            user: userId,
            organization: organizationId,
            fileType,
            mediaURL,
            name: req.file.originalname,
            isVisible: isVisible,
        });
        yield file.save();
        res.status(201).json(file);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error al subir el archivo", error });
    }
});
exports.uploadFile = uploadFile;
// Obtener todos los archivos de una organización
const getFiles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isVisible = req.query.isVisible;
        if (isVisible) {
            const files = yield FileModel_1.default.find({
                organization: req.user.organizationId,
                isVisible: isVisible,
            }).limit(100);
            res.status(200).json(files);
            return;
        }
        const files = yield FileModel_1.default.find({ organization: req.user.organizationId });
        res.status(200).json(files);
    }
    catch (error) {
        res.status(500).json({ message: "Error al obtener los archivos", error });
    }
});
exports.getFiles = getFiles;
// Eliminar un archivo de Cloudinary y de la base de datos
const deleteFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = yield FileModel_1.default.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: "Archivo no encontrado" });
        }
        yield cloudinary.uploader.destroy(file.mediaURL, { resource_type: "auto" });
        res.status(200).json({ message: "Archivo eliminado correctamente" });
    }
    catch (error) {
        res.status(500).json({ message: "Error al eliminar el archivo", error });
    }
});
exports.deleteFile = deleteFile;
