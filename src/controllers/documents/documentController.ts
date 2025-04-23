import { Request, Response } from "express";
import DocumentModel from "../../models/DocumentModel";
import mongoose from "mongoose";
import { subirArchivo } from "../../config/aws";


export const createDocument = async (req: Request, res: Response) => {
    try {


        if (!req.file) {
            return res.status(400).json({
                message: "No se ha proporcionado ningún archivo"
            });
        }

        const { 
            name, 
            description, 
            tags, 
            metadata, 
            organizationId,
            uploadedBy
        } = req.body;

        console.log(req.body, "uploadedBy");
       
        if(!uploadedBy || !organizationId){
            return res.status(400).json({
                message: "No se ha proporcionado el usuario que sube el documento o la organización"
            });
        }
       

       

        // Obtener la URL del archivo
        const fileURL = (req.file as any).path || (req.file as any).location || '';

        // Subir el archivo a S3 
        const uploadedFile = await subirArchivo(req.file.buffer, req.file.originalname, req.file.mimetype);
 

        // Crear el documento
        const newDocument = new DocumentModel({
            name: name || req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            uploadedBy: uploadedBy,
            fileURL: uploadedFile,
            description,
            tags: tags ? JSON.parse(tags) : [],
            metadata: metadata ? JSON.parse(metadata) : {},
            organizationId: new mongoose.Types.ObjectId(organizationId)
        });

        const savedDocument = await newDocument.save();

        res.status(201).json({
            message: "Documento creado correctamente",
            data: savedDocument
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al crear el documento",
            error: error
        });
    }
};

export const getAllDocuments = async (req: Request, res: Response) => {
    try {
        const { organizationId, status, type, tags } = req.query;
        
        const filter: any = {};
        
        // Filtrar por organización si se proporciona
        if (organizationId && mongoose.Types.ObjectId.isValid(organizationId as string)) {
            filter.organizationId = organizationId;
        } else if (req.user?.organizationId) {
            // Si no se proporciona, usar la organización del usuario
            filter.organizationId = new mongoose.Types.ObjectId(req.user.organizationId);
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

        const documents = await DocumentModel.find(filter)
            .populate('uploadedBy', 'name email')
            .sort({ uploadDate: -1 });

        res.status(200).json({
            message: "Documentos recuperados correctamente",
            count: documents.length,
            data: documents
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar los documentos",
            error: error
        });
    }
};

export const getDocumentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido"
            });
        }

        const document = await DocumentModel.findById(id)
            .populate('uploadedBy', 'name email');

        if (!document) {
            return res.status(404).json({
                message: "Documento no encontrado"
            });
        }

        res.status(200).json({
            message: "Documento recuperado correctamente",
            data: document
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar el documento",
            error: error
        });
    }
};

export const updateDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, tags, metadata, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido"
            });
        }

        const updateData: any = {};

        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (tags) updateData.tags = JSON.parse(tags);
        if (metadata) updateData.metadata = JSON.parse(metadata);
        if (status) updateData.status = status;

        const updatedDocument = await DocumentModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedDocument) {
            return res.status(404).json({
                message: "Documento no encontrado"
            });
        }

        res.status(200).json({
            message: "Documento actualizado correctamente",
            data: updatedDocument
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al actualizar el documento",
            error: error
        });
    }
};

export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "ID de documento inválido"
            });
        }

        const document = await DocumentModel.findByIdAndDelete(id);

        if (!document) {
            return res.status(404).json({
                message: "Documento no encontrado"
            });
        }

        // Aquí deberías también eliminar el archivo físico
        // Ejemplo: fs.unlinkSync(document.fileURL);

        res.status(200).json({
            message: "Documento eliminado correctamente"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al eliminar el documento",
            error: error
        });
    }
};

export const getDocumentsByOrganization = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                message: "ID de organización inválido"
            });
        }

        const documents = await DocumentModel.find({ organizationId, status: 'active' })
            .populate('uploadedBy', 'name email')
            .sort({ uploadDate: -1 });

        res.status(200).json({
            message: "Documentos de la organización recuperados correctamente",
            count: documents.length,
            data: documents
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error al recuperar los documentos de la organización",
            error: error
        });
    }
};