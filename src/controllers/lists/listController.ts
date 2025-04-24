import { Request, Response } from "express";
import List from "../../models/ListModel";
import Contact from "../../models/ContactModel";
import DealsModel from "../../models/DealsModel";
import ExcelJS from "exceljs";

// Crear Lista Estática
export const createStaticList = async (req: Request, res: Response) => {
  try {
    console.log("=== INICIO CREACIÓN DE LISTA ESTÁTICA ===");
    const { name, description, filters } = req.body;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;
    
    console.log("Datos recibidos:", {
      name,
      description,
      userId,
      organizationId,
      filters: JSON.stringify(filters).substring(0, 200) + (JSON.stringify(filters).length > 200 ? "..." : "")
    });

    if (!filters) {
      console.error("Error: No se recibieron filtros");
      return res.status(400).json({ message: "Se requieren filtros para crear la lista" });
    }
    
    const { Deals, Contacts } = filters;
    
    console.log("Filtros extraídos:", { 
      tienenDeals: Array.isArray(Deals) ? Deals.length : "No es array", 
      tienenContacts: Array.isArray(Contacts) ? Contacts.length : "No es array",
      filtrosGenerales: Array.isArray(filters) ? filters.length : "No es array"
    });

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

    console.log("Intentando construir consulta de contactos...");
    
    // Verificar estructura de filtros para consulta MongoDB
    if (!Array.isArray(filters)) {
      console.error("Error: filters no es un array para la consulta de contactos");
      console.log("Tipo de filters:", typeof filters);
      console.log("Contenido de filters:", filters);
      return res.status(400).json({ message: "Formato de filtros incorrecto. Se espera un array." });
    }

    const contactQuery = {
      organizationId,
      $and: filters.map(
        (filter: { key: string; operator: OperatorType; value: string }) => {
          console.log("Procesando filtro:", filter);
          
          if (!filter.key || !filter.operator) {
            console.warn("Filtro incompleto:", filter);
          }
          
          const operatorFn = operatorMap[filter.operator];
          if (!operatorFn) {
            console.warn(`Operador desconocido: ${filter.operator}`);
          }
          
          return {
            $and: [
              { "properties.key": filter.key },
              {
                "properties.value": operatorFn?.(
                  filter.value
                ) || { $regex: filter.value, $options: "i" },
              },
            ],
          };
        }
      ),
    };

    console.log("Consulta de contactos generada:");
    console.log(JSON.stringify(contactQuery, null, 2));

    // Get contact IDs
    console.log("Buscando contactos con la consulta generada...");
    const contacts = await Contact.find(contactQuery)
      .select("_id")
      .lean()
      .exec();

    console.log(`Encontrados ${contacts.length} contactos`);
    
    let contactIds = contacts.map((contact) => contact._id);

    // Process deals filters if they exist
    if (Array.isArray(Deals) && Deals.length > 0) {
      console.log("Procesando filtros de deals:", Deals);
      
      const hasDealsFilter = Deals.find(
        (filter) => filter.field === "hasDeals"
      );
      
      if (hasDealsFilter) {
        console.log("Filtro hasDeals encontrado:", hasDealsFilter);
      }

      // Build deals query
      const dealsQuery = {
        associatedContactId: { $in: contactIds },
        ...Deals.reduce((acc, filter) => {
          if (filter.field === "hasDeals") return acc;

          console.log("Procesando filtro de deals:", filter);
          
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

          const conditionFn = conditions[filter.condition as Condition];
          if (!conditionFn) {
            console.warn(`Condición de deal desconocida: ${filter.condition}`);
          }

          return {
            [filter.field]: conditionFn?.(
              filter.value
            ),
          };
        }, {}),
      };

      console.log("Consulta de deals generada:");
      console.log(JSON.stringify(dealsQuery, null, 2));

      console.log("Buscando deals asociados a los contactos...");
      const deals = await DealsModel.distinct(
        "associatedContactId",
        dealsQuery
      );
      console.log(`Encontrados ${deals.length} deals asociados`);
      
      const dealsSet = new Set(deals.map((id) => id.toString()));

      if (hasDealsFilter) {
        const contactIdsBeforeFilter = contactIds.length;
        contactIds = contactIds.filter(
          (id) => hasDealsFilter.value === dealsSet.has(id.toString())
        );
        console.log(`Filtro hasDeals aplicado: ${contactIdsBeforeFilter} -> ${contactIds.length} contactos`);
      }
    }

    // Create and save list
    console.log("Creando nueva lista con", contactIds.length, "contactos");
    
    // En lugar de JSON.stringify(filters), pasamos los filtros directamente
    // Error actual: filters está siendo guardado como string cuando debería ser un array
    console.log("Tipo de filtros antes de crear la lista:", typeof filters, Array.isArray(filters));
    
    const list = new List({
      name,
      description,
      filters: filters, // No usar JSON.stringify aquí
      contactIds,
      isDynamic: false,
      userId,
      organizationId,
    });

    console.log("Guardando lista en la base de datos...");
    await list.save();
    console.log("Lista guardada exitosamente");
    
    console.log("=== FIN CREACIÓN DE LISTA ESTÁTICA ===");
    res.status(201).json(list);
  } catch (error) {
    console.error("=== ERROR EN CREACIÓN DE LISTA ESTÁTICA ===");
    console.error("Detalles del error:", error);
    if (error instanceof Error) {
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);
    }
    res.status(500).json({ message: "Error creando la lista estática", error });
  }
};

// Crear Lista Dinámica
export const createDynamicList = async (req: Request, res: Response) => {
  console.log("=== INICIO CREACIÓN DE LISTA DINÁMICA ===");
  const { name, description } = req.body;
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;
  
  console.log("Datos recibidos:", {
    name,
    description,
    userId,
    organizationId,
    filtros: req.body.filters ? JSON.stringify(req.body.filters).substring(0, 200) + (JSON.stringify(req.body.filters).length > 200 ? "..." : "") : "No hay filtros"
  });
  
  if (!req.body.filters) {
    console.error("Error: No se recibieron filtros");
    return res.status(400).json({ message: "Se requieren filtros para crear la lista dinámica" });
  }
  
  // Verificar estructura de filtros
  console.log("Tipo de filtros recibidos:", typeof req.body.filters, Array.isArray(req.body.filters));
  
  try {
    console.log("Tipo de filtros recibidos:", typeof req.body.filters, Array.isArray(req.body.filters));
    
    // No convertimos los filtros a string
    const filters = req.body.filters;
    console.log("Filtros a guardar:", filters);
    
    console.log("Creando nueva lista dinámica...");
    const list = new List({
      name,
      description,
      filters, // No usar JSON.stringify aquí
      isDynamic: true,
      userId,
      organizationId,
    });
    
    console.log("Guardando lista en la base de datos...");
    await list.save();
    console.log("Lista dinámica guardada exitosamente");
    
    console.log("=== FIN CREACIÓN DE LISTA DINÁMICA ===");
    res.status(201).json(list);
  } catch (error) {
    console.error("=== ERROR EN CREACIÓN DE LISTA DINÁMICA ===");
    console.error("Detalles del error:", error);
    if (error instanceof Error) {
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);
    }
    res.status(500).json({ message: "Error creando la lista dinámica", error });
  }
};

// Obtener Contactos de una Lista Dinámica
export const getDynamicListContacts = async (req: Request, res: Response) => {
  console.log("=== INICIO OBTENCIÓN DE CONTACTOS DE LISTA ===");
  const { id, page = 1, limit = 10 } = req.query;
  
  console.log("Parámetros recibidos:", { id, page, limit });
  
  try {
    console.log(`Buscando lista con ID: ${id}`);
    const list = await List.findById(id).exec();
    if (!list) {
      console.error(`Lista con ID ${id} no encontrada`);
      res.status(404).json({ message: "Lista no encontrada" });
      return;
    }
    
    console.log("Lista encontrada:", {
      id: list._id,
      name: list.name,
      isDynamic: list.isDynamic,
      tieneContactsIds: Array.isArray(list.contactIds) ? list.contactIds.length : "No es array",
      filtros: Array.isArray(list.filters) ? 
        `Array con ${list.filters.length} filtros` : 
        `Tipo: ${typeof list.filters}`
    });

    let contacts, totalContacts;
    if (list.isDynamic) {
      console.log("Obteniendo contactos de lista dinámica");
      try {
        console.log("Filtros de la lista:", list.filters);
        
        // Construir la consulta de filtros para MongoDB basada en los filtros almacenados
        let filterQuery: any = { organizationId: req.user?.organizationId };
        
        if (Array.isArray(list.filters) && list.filters.length > 0) {
          // Procesar la lista de filtros directamente
          const filtersConditions = list.filters.map(filter => {
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
                { "properties.value": valueCondition }
              ]
            };
          });
          
          filterQuery.$and = filtersConditions;
          console.log("Consulta generada para lista dinámica:", JSON.stringify(filterQuery));
        } else {
          console.log("No hay filtros o no están en formato array");
        }
        
        console.log("Buscando contactos que coincidan con los filtros...");
        contacts = await Contact.find(filterQuery)
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit))
          .exec();
        
        console.log(`Contactos encontrados: ${contacts.length}`);
        
        totalContacts = await Contact.countDocuments(filterQuery).exec();
        console.log(`Total de contactos: ${totalContacts}`);
      } catch (error) {
        console.error("Error al procesar filtros de lista dinámica:", error);
        if (error instanceof Error) {
          console.error("Mensaje:", error.message);
        }
        throw error;
      }
    } else {
      console.log("Obteniendo contactos de lista estática");
      console.log(`Total de IDs de contactos en la lista: ${list.contactIds.length}`);
      
      contacts = await Contact.find({ _id: { $in: list.contactIds } })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .exec();
      
      console.log(`Contactos encontrados: ${contacts.length}`);
      totalContacts = list.contactIds.length;
    }

    console.log("=== FIN OBTENCIÓN DE CONTACTOS DE LISTA ===");
    res.status(200).json({
      totalContacts,
      totalPages: Math.ceil(totalContacts / Number(limit)),
      currentPage: Number(page),
      contacts,
    });
  } catch (error) {
    console.error("=== ERROR EN OBTENCIÓN DE CONTACTOS DE LISTA ===");
    console.error("Detalles del error:", error);
    if (error instanceof Error) {
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);
    }
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
