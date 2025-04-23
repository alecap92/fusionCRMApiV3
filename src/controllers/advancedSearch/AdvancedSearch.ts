import { Request, Response } from "express";
import ContactModel from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";

export const advancedSearch = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { limit = 20, page = 1 } = req.query;
    const search = req.body.searchParams;

    const searchData = String(search || "").trim();

    if (searchData.length < 3) {
      return res.status(400).json({
        message: "El término de búsqueda debe tener al menos 3 caracteres",
      });
    }

    const cleanSearch = searchData.replace(/[\s\(\)\-\+\.]/g, "");
    const regex = new RegExp(cleanSearch, "i");
    const regexRaw = new RegExp(searchData, "i");

    const limitNumber = Math.max(1, parseInt(limit as string, 10));
    const pageNumber = Math.max(1, parseInt(page as string, 10));

    // Buscar contactos
    const contacts = await ContactModel.find({
      organizationId,
      $or: [
        {
          "properties.key": "firstName",
          "properties.value": { $regex: regexRaw },
        },
        {
          "properties.key": "lastName",
          "properties.value": { $regex: regexRaw },
        },
        { "properties.key": "mobile", "properties.value": { $regex: regex } },
        { "properties.key": "phone", "properties.value": { $regex: regex } },
        {
          "properties.key": "companyName",
          "properties.value": { $regex: regexRaw },
        },
      ],
    })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber)
      .exec();

    // Buscar deals con filtrado correcto
    const deals = await DealsModel.find({
      organizationId,
      title: { $regex: regexRaw },
    });

    return res.status(200).json({ contacts, deals });
  } catch (error) {
    console.error("Error en advancedSearch:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
