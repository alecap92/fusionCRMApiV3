import { Request, Response } from "express";
import List from "../../models/ListModel";
import Contact from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";
import ExcelJS from "exceljs";

// Crear Lista Estática
export const createStaticList = async (req: Request, res: Response) => {
  try {
    const { name, description, filters } = req.body;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;
    const { Deals, Contacts } = filters;

    // Build contact query using aggregation
    type OperatorType =
      | "contains"
      | "equals"
      | "starts with"
      | "ends with"
      | "is empty"
      | "is not empty";

    const operatorMap = {
      contains: (value: string) => ({ $regex: value, $options: "i" }),
      equals: (value: string) => value,
      "starts with": (value: string) => ({
        $regex: `^${value}`,
        $options: "i",
      }),
      "ends with": (value: string) => ({ $regex: `${value}$`, $options: "i" }),
      "is empty": () => ({ $in: ["", null] }),
      "is not empty": () => ({ $nin: ["", null] }),
    };

    const contactQuery = {
      organizationId,
      $and: filters.map(
        (filter: { key: string; operator: OperatorType; value: string }) => ({
          $and: [
            { "properties.key": filter.key },
            {
              "properties.value": operatorMap[filter.operator]?.(
                filter.value
              ) || { $regex: filter.value, $options: "i" },
            },
          ],
        })
      ),
    };

    // Get contact IDs
    const contacts = await Contact.find(contactQuery)
      .select("_id")
      .lean()
      .exec();

    let contactIds = contacts.map((contact) => contact._id);

    // Process deals filters if they exist
    if (Array.isArray(Deals) && Deals.length > 0) {
      const hasDealsFilter = Deals.find(
        (filter) => filter.field === "hasDeals"
      );

      // Build deals query
      const dealsQuery = {
        associatedContactId: { $in: contactIds },
        ...Deals.reduce((acc, filter) => {
          if (filter.field === "hasDeals") return acc;

          type Condition =
            | "equals"
            | "not_equals"
            | "greater_than"
            | "less_than"
            | "contains"
            | "not_contains";
          const conditions = {
            equals: (val: any) => val,
            not_equals: (val: any) => ({ $ne: val }),
            greater_than: (val: any) => ({ $gt: val }),
            less_than: (val: any) => ({ $lt: val }),
            contains: (val: any) => ({ $regex: val, $options: "i" }),
            not_contains: (val: any) => ({
              $not: { $regex: val, $options: "i" },
            }),
          };

          return {
            [filter.field]: conditions[filter.condition as Condition]?.(
              filter.value
            ),
          };
        }, {}),
      };

      const deals = await DealsModel.distinct(
        "associatedContactId",
        dealsQuery
      );
      const dealsSet = new Set(deals.map((id) => id.toString()));

      if (hasDealsFilter) {
        contactIds = contactIds.filter(
          (id) => hasDealsFilter.value === dealsSet.has(id.toString())
        );
      }
    }

    // Create and save list
    const list = new List({
      name,
      description,
      filters: JSON.stringify(filters),
      contactIds,
      isDynamic: false,
      userId,
      organizationId,
    });

    await list.save();
    res.status(201).json(list);
  } catch (error) {
    console.error("Error creating static list:", error);
    res.status(500).json({ message: "Error creando la lista estática", error });
  }
};

// Crear Lista Dinámica
export const createDynamicList = async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;
  const filters = JSON.stringify(req.body.filters);
  try {
    const list = new List({
      name,
      description,
      filters,
      isDynamic: true,
      userId,
      organizationId,
    });
    await list.save();
    res.status(201).json(list);
  } catch (error) {
    console.error("Error creating dynamic list:", error);
    res.status(500).json({ message: "Error creando la lista dinámica", error });
  }
};

// Obtener Contactos de una Lista Dinámica
export const getDynamicListContacts = async (req: Request, res: Response) => {
  const { id, page = 1, limit = 10 } = req.query;
  try {
    const list = await List.findById(id).exec();
    if (!list) {
      res.status(404).json({ message: "Lista no encontrada" });
      return;
    }

    let contacts, totalContacts;
    if (list.isDynamic) {
      contacts = await Contact.find(list.filters)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .exec();
      totalContacts = await Contact.countDocuments(list.filters).exec();
    } else {
      contacts = await Contact.find({ _id: { $in: list.contactIds } })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .exec();
      totalContacts = list.contactIds.length;
    }

    res.status(200).json({
      totalContacts,
      totalPages: Math.ceil(totalContacts / Number(limit)),
      currentPage: Number(page),
      contacts,
    });
  } catch (error) {
    console.error("Error retrieving list contacts:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los contactos de la lista", error });
  }
};

// Obtener Todas las Listas
export const getAllLists = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }
    const lists = await List.find({
      organizationId: req.user.organizationId,
    }).exec();
    res.status(200).json(lists);
  } catch (error) {
    console.error("Error retrieving lists:", error);
    res.status(500).json({ message: "Error al obtener las listas", error });
  }
};

// Actualizar Lista
export const updateList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, filters, isDynamic } = req.body;
  try {
    const list = await List.findById(id).exec();
    if (!list) {
      res.status(404).json({ message: "Lista no encontrada" });
      return;
    }

    list.name = name || list.name;
    list.description = description || list.description;
    list.filters = filters || list.filters;
    list.isDynamic = isDynamic !== undefined ? isDynamic : list.isDynamic;

    if (!isDynamic) {
      const contacts = await Contact.find(filters).select("_id").exec();
      list.contactIds = contacts.map((contact) => contact._id as any);
    } else {
      list.contactIds = [];
    }

    await list.save();
    res.status(200).json(list);
  } catch (error) {
    console.error("Error updating list:", error);
    res.status(500).json({ message: "Error al actualizar la lista", error });
  }
};

// Eliminar Lista
export const deleteList = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const list = await List.findByIdAndDelete(id).exec();
    if (!list) {
      res.status(404).json({ message: "Lista no encontrada" });
      return;
    }

    res.status(200).json({ message: "Lista eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({ message: "Error al eliminar la lista", error });
  }
};

function transformContactsForExcel(contacts: any[]) {
  return contacts.map((contact) => {
    const flat: Record<string, string> = {};

    if (Array.isArray(contact.properties)) {
      contact.properties.forEach((prop: any) => {
        if (prop.isVisible && prop.value !== "") {
          flat[prop.key] = prop.value;
        }
      });
    }

    return flat;
  });
}
export const exportList = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const list = await List.findOne({ _id: id, organizationId }).exec();
    if (!list) return res.status(404).json({ message: "Lista no encontrada" });

    let contacts = [];

    // 🧠 Buscar contactos
    if (list.isDynamic && list.filters?.length > 0) {
      const query: any = { organizationId };
      for (const filter of list.filters) {
        switch (filter.operator) {
          case "contains":
            query[filter.key] = { $regex: filter.value, $options: "i" };
            break;
          case "equals":
            query[filter.key] = filter.value;
            break;
        }
      }
      contacts = await Contact.find(query).exec();
    } else {
      contacts = await Contact.find({
        _id: { $in: list.contactIds },
        organizationId,
      }).exec();
    }

    // 🔄 Transformar contactos para Excel
    const transformContactsForExcel = (contacts: any[]) => {
      return contacts.map((contact) => {
        const flat: Record<string, string> = {};
        if (Array.isArray(contact.properties)) {
          contact.properties.forEach((prop: any) => {
            if (prop.isVisible && prop.value !== "") {
              flat[prop.key] = prop.value;
            }
          });
        }
        return flat;
      });
    };

    const transformedContacts = transformContactsForExcel(contacts);

    // 📦 Crear Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Contactos");

    // Headers dinámicos
    const allKeys = new Set<string>();
    transformedContacts.forEach((c) =>
      Object.keys(c).forEach((k) => allKeys.add(k))
    );

    worksheet.columns = Array.from(allKeys).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    // Agregar filas
    transformedContacts.forEach((row) => {
      worksheet.addRow(row);
    });

    // Enviar como descarga
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Export-${list.name}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando lista:", error);
    res.status(500).json({ message: "Error al exportar la lista", error });
  }
};
