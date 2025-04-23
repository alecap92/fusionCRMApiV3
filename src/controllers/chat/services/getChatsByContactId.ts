import { Request, Response } from "express";    
import Message from "../../../models/MessageModel";
import ContactModel from "../../../models/ContactModel";

export const getChatsByContactId = async (req: Request, res: Response) => {
    try{
     
       const organizationId = req.user?.organizationId;
       const {page = 1, limit = 10} = req.query;
       const contactId = req.params.contactId;
       const userId = req.user?._id;
       
       // Convertir page y limit a valores numéricos
       const pageNum = parseInt(page.toString(), 10);
       const limitNum = parseInt(limit.toString(), 10);
       
       if (!organizationId) {  
            return res.status(401).json({ message: "No tienes permisos para obtener los chats" });
        }

        if (!contactId) {
            return res.status(400).json({ message: "El id del contacto es requerido" });
        }

        const query ={
            organization: organizationId,
            user: userId,
            $or: [{ from: contactId }, { to: contactId }],
        }

        const chats = await Message.find(query)
        .populate("replyToMessage")
        .sort({ timestamp: 1, _id: 1 })
        .skip(pageNum)
        .limit(limitNum);

        // Buscar si existe un contacto con el número de teléfono/móvil
        const contact = await ContactModel.findOne({
            organizationId: organizationId,
            properties: {
                $elemMatch: {
                    $or: [
                        { key: 'phone', value: contactId },
                        { key: 'mobile', value: contactId }
                    ]
                }
            }
        });
        


        return res.status(200).json({
            messages: chats,
            isContact: contact?._id ? contact?._id  : false
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error al obtener los chats" });
    }
}