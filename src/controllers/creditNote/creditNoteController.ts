import { Request, Response } from "express";
import { createCreditNoteInApi } from "../../services/invoice/invoiceService";


export const createCreditNote = async (req: Request, res: Response) => {

    try {
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        
        const creditNote = req.body;

        const response = await createCreditNoteInApi(creditNote, organizationId);


            
        if(response.success === false){
            return res.status(400).json({ message: response.message });
        }

    return res.status(200).json({ message: "Nota de crédito creada correctamente" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error al crear la nota de crédito", error: error });
    }

}
