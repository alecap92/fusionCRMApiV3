import { Request, Response } from "express";
import ContactModel from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";

// Filtros avanzados para contactos y negocios (deals)
export const advancedFilterContacts = async (req: Request, res: Response) => {
  try {
    const { Deals, Contacts } = req.body;
    const organizationId = req.user?.organizationId;

    if (!Contacts || !Array.isArray(Contacts)) {
      return res.status(400).json({
        message: "Faltan los filtros de contactos o formato incorrecto",
      });
    }

    // Query inicial para contactos
    const contactQuery: any = {
      organizationId,
      $and: [],
    };

    // Procesar cada filtro de Contactos
    for (const filter of Contacts) {
      const condition: any = {};
      switch (filter.condition) {
        case "equals":
          condition["value"] = filter.value;
          break;
        case "not_equals":
          condition["value"] = { $ne: filter.value };
          break;
        case "contains":
          condition["value"] = { $regex: filter.value, $options: "i" };
          break;
        case "not_contains":
          condition["value"] = {
            $not: { $regex: filter.value, $options: "i" },
          };
          break;
        case "is_empty":
          condition["value"] = { $eq: "" };
          break;
        case "is_not_empty":
          condition["value"] = { $ne: "" };
          break;
        default:
          console.warn(`Condición desconocida: ${filter.condition}`);
          continue;
      }

      contactQuery.$and.push({
        properties: { $elemMatch: { key: filter.field, ...condition } },
      });
    }

    if (contactQuery.$and.length === 0) {
      delete contactQuery.$and;
    }

    // Buscar contactos
    const contacts = await ContactModel.find(contactQuery)
      .select("_id properties")
      .lean()
      .exec();

    // Obtener IDs de los contactos filtrados
    const contactIds = contacts.map((contact) => contact._id);

    // Construir la consulta dinámica de Deals si hay filtros
    let dealsQuery: any = { associatedContactId: { $in: contactIds } };
    let hasDealsFilter: boolean | undefined;

    if (Array.isArray(Deals)) {
      for (const dealFilter of Deals) {
        if (dealFilter.field === "hasDeals") {
          hasDealsFilter = dealFilter.value;
        } else {
          switch (dealFilter.condition) {
            case "equals":
              dealsQuery[dealFilter.field] = dealFilter.value;
              break;
            case "not_equals":
              dealsQuery[dealFilter.field] = { $ne: dealFilter.value };
              break;
            case "greater_than":
              dealsQuery[dealFilter.field] = { $gt: dealFilter.value };
              break;
            case "less_than":
              dealsQuery[dealFilter.field] = { $lt: dealFilter.value };
              break;
            case "contains":
              dealsQuery[dealFilter.field] = {
                $regex: dealFilter.value,
                $options: "i",
              };
              break;
            case "not_contains":
              dealsQuery[dealFilter.field] = {
                $not: { $regex: dealFilter.value, $options: "i" },
              };
              break;
            default:
              console.warn(
                `Condición desconocida en Deals: ${dealFilter.condition}`
              );
              continue;
          }
        }
      }
    }

    // Obtener los Deals filtrados
    const deals = await DealsModel.find(dealsQuery)
      .select("associatedContactId")
      .lean()
      .exec();

    // Crear un Set para acceso rápido
    const contactsWithDeals = new Set(
      deals.map((deal) => deal.associatedContactId.toString())
    );

    // Transformar la estructura de la respuesta
    let transformedContacts = contacts.map((contact) => ({
      _id: contact._id,
      properties: contact.properties.reduce(
        (acc, prop) => {
          acc[prop.key] = prop.value;
          return acc;
        },
        {} as Record<string, string>
      ),
      hasDeals: contactsWithDeals.has(contact._id.toString()),
    }));

    // Aplicar filtro de hasDeals si se envió en la petición
    if (hasDealsFilter !== undefined) {
      transformedContacts = transformedContacts.filter(
        (contact) => contact.hasDeals === hasDealsFilter
      );
    }

    return res.status(200).json(transformedContacts);
  } catch (error) {
    console.error("Error aplicando filtros avanzados:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};
