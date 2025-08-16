import { Request, Response } from "express";
import Contact from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";

// Interface para los filtros avanzados
interface FilterCondition {
  field: string;
  condition: string;
  value?: string;
}

// Obtener un solo contacto por ID
export const getContact = async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    const organizationId = req.user?.organizationId as string;

    const contact = await Contact.findById(contactId).populate("EmployeeOwner");

    if (!contact) {
      return res.status(404).json({ message: "Contacto no encontrado" });
    }

    const deals = await DealsModel.find({ associatedContactId: contactId })
      .populate("status")
      .exec();

    const totalRevenue = deals.reduce((acc, deal) => acc + deal.amount, 0);

    const lastDeal =
      deals.length > 0
        ? deals.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
        : null;

    return res.status(200).json({
      contact,
      deals,
      notes: [],
      resume: {
        totalRevenue,
        totalDeals: deals.length,
        totalNotes: 0,
        lastDeal,
      },
      conversations: [],
    });
  } catch (error) {
    console.error("Error obteniendo el contacto:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener todos los contactos
export const getContacts = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId as string;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!organizationId) {
      res.status(400).json({ message: "organizationId is required" });
      return;
    }

    const contacts = await Contact.find({ organizationId })
      .skip((page - 1) * limit + offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const total = await Contact.countDocuments({ organizationId });

    // Calcular totalRevenue por contacto
    const contactIds = contacts.map((c: any) => c._id);
    let revenueByContact: Record<string, number> = {};
    if (contactIds.length > 0) {
      const revenueAgg = await DealsModel.aggregate([
        { $match: { associatedContactId: { $in: contactIds } } },
        {
          $group: {
            _id: "$associatedContactId",
            totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]).exec();
      revenueByContact = revenueAgg.reduce((acc: Record<string, number>, cur: any) => {
        acc[String(cur._id)] = cur.totalRevenue || 0;
        return acc;
      }, {});
    }

    const contactsWithRevenue = contacts.map((c: any) => ({
      ...c,
      totalRevenue: revenueByContact[String(c._id)] || 0,
    }));

    res.status(200).json({
      data: contactsWithRevenue,
      total,
    });
  } catch (error) {
    console.error("Error obteniendo los contactos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Crear un nuevo contacto
export const createContact = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId as string;

    const parsedProperties = Object.entries(req.body).map(([key, value]) => ({
      key,
      value,
    }));

    const newContact = new Contact({
      properties: parsedProperties,
      organizationId,
      EmployeeOwner: req.user?._id,
    });

    await newContact.save();

    res.status(201).json(newContact);
  } catch (error) {
    console.error("Error creando el contacto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar contactos
export const deleteContact = async (req: Request, res: Response) => {
  const userIds = req.body.ids;

  try {
    const deletedContacts = await Contact.deleteMany({ _id: { $in: userIds } });
    res.status(200).json({ message: "Contactos eliminados", deletedContacts });
  } catch (error) {
    console.error("Error eliminando los contactos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar un contacto
export const updateContact = async (req: Request, res: Response) => {
  const contactId = req.params.id;
  const form = req.body;

  console.log(req.body);

  try {
    const updatedContact = await Contact.findByIdAndUpdate(contactId, form, {
      new: true,
    }).exec();

    if (!updatedContact) {
      res.status(404).json({ message: "Contacto no encontrado" });
      return;
    }

    res.status(200).json({ message: "Contacto actualizado", updatedContact });
  } catch (error) {
    console.error("Error actualizando el contacto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const searchContact = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    const { search, limit = 20, page = 1 } = req.query;

    if (!organizationId || !search) {
      res.status(400).json({ message: "Faltan parámetros" });
      return;
    }

    // Normalizar el valor de búsqueda eliminando caracteres no numéricos

    if (typeof search !== "string" || search.length < 3) {
      res.status(400).json({
        message: "El término de búsqueda debe tener al menos 3 caracteres",
      });
      return;
    }

    // Crear una expresión regular a partir del valor normalizado

    // Convertir limit y page a números enteros
    const limitNumber = Math.max(1, parseInt(limit as string, 10));
    const pageNumber = Math.max(1, parseInt(page as string, 10));

    const contacts = await Contact.find({
      organizationId,
      $or: [
        {
          "properties.key": "firstName",
          "properties.value": { $regex: search },
        },
        {
          "properties.key": "lastName",
          "properties.value": { $regex: search },
        },
        {
          "properties.key": "mobile",
          "properties.value": { $regex: search },
        },
        {
          "properties.key": "phone",
          "properties.value": { $regex: search },
        },
        {
          "properties.key": "companyType",
          "properties.value": { $regex: search },
        },
        {
          "properties.key": "companyName",
          "properties.value": { $regex: search },
        },
      ],
    })
      .limit(limitNumber)
      .skip((pageNumber - 1) * limitNumber)
      .lean()
      .exec();

    // Calcular totalRevenue por contacto en resultados de búsqueda
    const contactIds = contacts.map((c: any) => c._id);
    let revenueByContact: Record<string, number> = {};
    if (contactIds.length > 0) {
      const revenueAgg = await DealsModel.aggregate([
        { $match: { associatedContactId: { $in: contactIds } } },
        {
          $group: {
            _id: "$associatedContactId",
            totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]).exec();
      revenueByContact = revenueAgg.reduce((acc: Record<string, number>, cur: any) => {
        acc[String(cur._id)] = cur.totalRevenue || 0;
        return acc;
      }, {});
    }

    const contactsWithRevenue = contacts.map((c: any) => ({
      ...c,
      totalRevenue: revenueByContact[String(c._id)] || 0,
    }));

    res.status(200).json(contactsWithRevenue);
  } catch (error) {
    console.error("Error buscando contactos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const filterContacts = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const filters = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;

    if (!organizationId || !filters) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const filterConditions = filters.map((filter: any) => {
      let valueCondition;

      switch (filter.operator) {
        case "contains":
          valueCondition = { $regex: filter.value, $options: "i" };
          break;
        case "equals":
          valueCondition = filter.value;
          break;
        case "starts with":
          valueCondition = { $regex: `^${filter.value}`, $options: "i" };
          break;
        case "ends with":
          valueCondition = { $regex: `${filter.value}$`, $options: "i" };
          break;
        case "is empty":
          valueCondition = { $in: ["", null] };
          break;
        case "is not empty":
          valueCondition = { $nin: ["", null] };
          break;
        default:
          valueCondition = { $regex: filter.value, $options: "i" };
      }

      return {
        $and: [
          { "properties.key": filter.key },
          { "properties.value": valueCondition },
        ],
      };
    });

    const query = {
      organizationId,
      $and: filterConditions,
    };

    const contacts = await Contact.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const total = await Contact.countDocuments(query);

    // Calcular totalRevenue para resultados filtrados
    const contactIds = contacts.map((c: any) => c._id);
    let revenueByContact: Record<string, number> = {};
    if (contactIds.length > 0) {
      const revenueAgg = await DealsModel.aggregate([
        { $match: { associatedContactId: { $in: contactIds } } },
        {
          $group: {
            _id: "$associatedContactId",
            totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]).exec();
      revenueByContact = revenueAgg.reduce((acc: Record<string, number>, cur: any) => {
        acc[String(cur._id)] = cur.totalRevenue || 0;
        return acc;
      }, {});
    }

    const contactsWithRevenue = contacts.map((c: any) => ({
      ...c,
      totalRevenue: revenueByContact[String(c._id)] || 0,
    }));

    res.status(200).json({
      data: contactsWithRevenue,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error filtering contacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};
