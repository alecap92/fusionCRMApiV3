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
exports.deleteContactFile = exports.createContactFile = void 0;
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const aws_1 = require("../../config/aws");
const createContactFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No se ha proporcionado ningún archivo"
            });
        }
        const { name, organizationId, uploadedBy, contactId } = req.body;
        if (!uploadedBy || !organizationId) {
            return res.status(400).json({
                message: "No se ha proporcionado el usuario que sube el documento o la organización"
            });
        }
        // Subir el archivo a S3 
        const uploadedFile = yield (0, aws_1.subirArchivo)(req.file.buffer, req.file.originalname, req.file.mimetype);
        const contactFile = {
            name: name || req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            url: uploadedFile,
            uploadedBy: uploadedBy,
            uploadDate: new Date()
        };
        const contact = yield ContactModel_1.default.findByIdAndUpdate(contactId, { $push: { files: contactFile } });
        if (!contact) {
            return res.status(400).json({
                message: "No se ha proporcionado el contacto"
            });
        }
        res.status(201).json({
            message: "Archivo de contacto creado correctamente",
            data: contact
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error al crear el archivo de contacto", error });
    }
});
exports.createContactFile = createContactFile;
const deleteContactFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { contactId, fileId } = req.params;
        console.log(contactId, fileId, 'contactId, fileId');
        if (!contactId || !fileId) {
            return res.status(400).json({
                message: "No se ha proporcionado el contacto o el archivo"
            });
        }
        const contact = yield ContactModel_1.default.findById(contactId);
        if (!contact) {
            return res.status(400).json({
                message: "No se ha proporcionado el contacto"
            });
        }
        const file = contact.files.find(file => file._id.toString() === fileId);
        if (!file) {
            return res.status(400).json({
                message: "No se ha proporcionado el archivo"
            });
        }
        contact.files = contact.files.filter(file => file._id.toString() !== fileId);
        yield contact.save();
        res.status(200).json({
            message: "Archivo de contacto eliminado correctamente",
            data: contact
        });
    }
    catch (error) {
        console.log(error, 'error');
        res.status(500).json({ message: "Error al eliminar el archivo de contacto", error });
    }
});
exports.deleteContactFile = deleteContactFile;
