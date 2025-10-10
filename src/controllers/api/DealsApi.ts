import { Request, Response } from "express";
import DealsModel from "../../models/DealsModel";
import ContactModel from "../../models/ContactModel";
import PipelinesModel from "../../models/PipelinesModel";
import StatusModel from "../../models/StatusModel";
import DealsFieldsModel from "../../models/DealsFieldsModel";
import DealsFieldsValuesModel from "../../models/DealsFieldsValuesModel";

export const createDeal = async (req: Request, res: Response) => {
  try {
    const { title, amount, contact, customFields } = req.body;
    const { pipeline, status, organizationId } = req.query;

    console.log(req.body);
    console.log(req.query);

    // Validación básica
    if (!title || !amount || !contact?.mobile || !organizationId) {
      return res.status(400).json({
        message: "Faltan datos obligatorios",
        required: ["title", "amount", "contact.mobile", "organizationId"],
      });
    }

    // Validar que amount sea un número
    if (isNaN(Number(amount))) {
      return res.status(400).json({
        message: "El campo 'amount' debe ser un número válido",
      });
    }

    // Validar que pipeline existe y pertenece a la organización
    if (pipeline) {
      const pipelineExists = await PipelinesModel.findOne({
        _id: pipeline,
        organizationId: organizationId,
      });

      if (!pipelineExists) {
        return res.status(400).json({
          message: "Pipeline no encontrado o no pertenece a la organización",
        });
      }
    }

    // Validar que status existe y pertenece al pipeline
    if (status && pipeline) {
      const statusExists = await StatusModel.findOne({
        _id: status,
        pipeline: pipeline,
        organizationId: organizationId,
      });

      if (!statusExists) {
        return res.status(400).json({
          message: "Status no encontrado o no pertenece al pipeline",
        });
      }
    }

    // Validar campos personalizados si se proporcionan
    if (customFields && pipeline) {
      // Obtener todos los campos disponibles para este pipeline
      const availableFields = await DealsFieldsModel.find({
        pipeline: pipeline,
      });

      // Validar que todos los campos personalizados enviados existan en el pipeline
      for (const customField of customFields) {
        const fieldExists = availableFields.find(
          (field) => field._id?.toString() === customField.field
        );

        if (!fieldExists) {
          return res.status(400).json({
            message: `Campo personalizado '${customField.field}' no existe en este pipeline`,
          });
        }

        // Validar campos requeridos
        if (
          fieldExists.required &&
          (!customField.value || customField.value.trim() === "")
        ) {
          return res.status(400).json({
            message: `El campo '${fieldExists.name}' es obligatorio`,
          });
        }
      }
    }

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
      // Construcción de propiedades CON isVisible (corregido)
      const properties = [
        {
          key: "firstName",
          value: contact.name?.trim() || "",
          isVisible: true,
        },
        { key: "mobile", value: contact.mobile?.trim() || "", isVisible: true },
        { key: "phone", value: contact.phone?.trim() || "", isVisible: true },
        { key: "email", value: contact.email?.trim() || "", isVisible: false },
        { key: "city", value: contact.ciudad?.trim() || "", isVisible: false },
        { key: "state", value: contact.estado?.trim() || "", isVisible: false },
        {
          key: "address",
          value: contact.direccion?.trim() || "",
          isVisible: false,
        },
        {
          key: "companyName",
          value: contact.empresa?.trim() || "",
          isVisible: false,
        },
        {
          key: "companyType",
          value: contact.companyType?.trim() || "",
          isVisible: false,
        },
        { key: "idNumber", value: contact.id?.trim() || "", isVisible: false },
      ].filter((prop) => prop.value !== ""); // Eliminar claves con valores vacíos

      // Crear el contacto si no existe
      const newContact = await ContactModel.create({
        organizationId: organizationId,
        properties,
      });

      associatedContactId = newContact._id;
    }

    // Crear el negocio (deal)
    const newDeal = await DealsModel.create({
      title,
      amount: Number(amount), // Asegurar que sea número
      closingDate: new Date(),
      pipeline,
      status: status || null,
      organizationId,
      associatedContactId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Procesar campos personalizados si se proporcionan
    if (customFields && customFields.length > 0) {
      const dealFields = customFields
        .filter((field: any) => field.value && field.value.trim() !== "")
        .map((field: any) => ({
          deal: newDeal._id,
          field: field.field,
          value: field.value.trim(),
        }));

      if (dealFields.length > 0) {
        await DealsFieldsValuesModel.insertMany(dealFields);
      }
    }

    res.status(201).json({
      success: true,
      data: newDeal,
      message: "Deal creado exitosamente",
    });
  } catch (error: any) {
    console.error("Error creating deal:", error);

    // Manejo de errores específicos de MongoDB
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Error de validación",
        errors: Object.values(error.errors).map((err: any) => err.message),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Formato de datos inválido",
        field: error.path,
        value: error.value,
      });
    }

    res.status(500).json({
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};
