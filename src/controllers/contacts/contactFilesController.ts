import { Request, Response } from "express";
import ContactModel from "../../models/ContactModel";
import { subirArchivo } from "../../config/aws";
import DocumentModel from "../../models/DocumentModel";


export const createContactFile = async (req: Request, res: Response) => {
    try{

        if (!req.file) {
            return res.status(400).json({
                message: "No se ha proporcionado ningún archivo"
            });
        }

        const { 
            name, 
            organizationId,
            uploadedBy,
            contactId
        } = req.body;


       
        if(!uploadedBy || !organizationId){
            return res.status(400).json({
                message: "No se ha proporcionado el usuario que sube el documento o la organización"
            });
        }
       

        // Subir el archivo a S3 
        const uploadedFile = await subirArchivo(req.file.buffer, req.file.originalname, req.file.mimetype);

        const contactFile = {
            name: name || req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            url: uploadedFile,
            uploadedBy: uploadedBy,
            uploadDate: new Date()
        }
        
        const contact = await ContactModel.findByIdAndUpdate(contactId, {$push: {files: contactFile}})
        
        if(!contact){
            return res.status(400).json({
                message: "No se ha proporcionado el contacto"
            });
        }

        res.status(201).json({
            message: "Archivo de contacto creado correctamente",
            data: contact
        });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el archivo de contacto", error });
    }
};


export const deleteContactFile = async (req: Request, res: Response) => {
    try{
        const { contactId, fileId } = req.params;


console.log(contactId, fileId, 'contactId, fileId')

        if(!contactId || !fileId){
            return res.status(400).json({
                message: "No se ha proporcionado el contacto o el archivo"
            });
        }

        const contact = await ContactModel.findById(contactId);

        if(!contact){
            return res.status(400).json({
                message: "No se ha proporcionado el contacto"
            }); 
        }

        const file = contact.files.find(file => file._id.toString() === fileId);

        if(!file){
            return res.status(400).json({
                message: "No se ha proporcionado el archivo"
            });
        }

        contact.files = contact.files.filter(file => file._id.toString() !== fileId);

        await contact.save();

        res.status(200).json({
            message: "Archivo de contacto eliminado correctamente",
            data: contact
        });
    } catch (error) {
        console.log(error, 'error')
        res.status(500).json({ message: "Error al eliminar el archivo de contacto", error });
    }
}