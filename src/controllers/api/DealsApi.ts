import { Request, Response } from "express";
import DealsModel from "../../models/DealsModel";
import ContactModel from "../../models/ContactModel";

/*
Creacion de negocios desde ManyChat.


TODO:
- Necesito agregar al contacto companyType, el Nit
- 

*/
export const createDeal = async (req: Request, res: Response) => {
  try {
    const { title, amount, contact } = req.body;
    const { pipeline, status, organizationId } = req.query;

    // Validación básica
    if (!title || !amount || !contact?.mobile || !organizationId) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    console.log("Request Data:", req.body, pipeline, status, organizationId);

    let associatedContactId;

    // Buscar si ya existe un contacto con ese número de móvil en la organización
    const contactExists = await ContactModel.findOne({
      organizationId: organizationId,
      "properties.key": "mobile",
      "properties.value": contact.mobile.trim(),
    });

    if (contactExists) {
      associatedContactId = contactExists._id;
    } else {
      // Construcción de propiedades sin `isVisible`
      const properties = [
        { key: "firstName", value: contact.name?.trim() || "" },
        { key: "mobile", value: contact.mobile?.trim() || "" },
        { key: "phone", value: contact.phone?.trim() || "" }, // Si el teléfono fijo es opcional
        { key: "email", value: contact.email?.trim() || "" },
        { key: "city", value: contact.ciudad?.trim() || "" },
        { key: "state", value: contact.estado?.trim() || "" }, // Si "state" es un campo requerido
        { key: "address", value: contact.direccion?.trim() || "" },
        { key: "companyName", value: contact.empresa?.trim() || "" },
        { key: "companyType", value: contact.companyType?.trim() || "" },
        { key: "idNumber", value: contact.id?.trim() || "" },
      ].filter((prop) => prop.value !== ""); // Eliminar claves con valores vacíos

      // Crear el contacto si no existe
      const newContact = await ContactModel.create({
        organizationId: organizationId,
        properties,
      });

      associatedContactId = newContact._id;
      console.log("Nuevo contacto creado:", newContact);
    }

    // Crear el negocio (deal)
    const newDeal = await DealsModel.create({
      title,
      amount,
      closingDate: new Date(),
      pipeline,
      status,
      organizationId,
      associatedContactId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json(newDeal);
  } catch (error: any) {
    console.error("Error creating deal:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
};
