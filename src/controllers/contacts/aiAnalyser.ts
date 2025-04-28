import { Request, Response } from "express";
import { analyseContactDetails } from "../../services/openAiService";
import ContactModel from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";
import ActivityModel from "../../models/ActivityModel";

export const analyseContact = async (req: Request, res: Response) => {
  try {
    console.log("analiseContact");
    const organizationId = req.user?.organizationId;
    const contactId = req.params.id;

    if (!organizationId) {
      return res.status(401).json({
        message: "No se proporcionó un ID de organización",
      });
    }

    if (!contactId) {
      return res.status(400).json({
        message: "No se proporcionó un ID de contacto",
      });
    }

    // Get contact details
    const contact = await ContactModel.findById(contactId);

    if (!contact) {
      return res.status(404).json({
        message: "Contacto no encontrado",
      });
    }

    // Get contact deals - ordenados por fecha de cierre (del más reciente al más antiguo)
    const deals = await DealsModel.find({
      associatedContactId: contactId,
    }).sort({ closingDate: -1 });

    // Get contact activities - ordenadas por fecha (más recientes primero)
    const activities = await ActivityModel.find({ contactId: contactId }).sort({
      createdAt: -1,
    });

    // Obtener análisis del contacto
    const analysisResult = await analyseContactDetails(
      contactId,
      organizationId,
      {
        details: contact,
        deals,
        activities,
      }
    );

    return res.status(200).json({
      message: "Contacto analizado correctamente",
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error("Error al analizar contacto:", error);
    return res.status(500).json({
      message: "Error al analizar el contacto",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
