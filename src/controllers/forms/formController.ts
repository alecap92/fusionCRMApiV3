import { Request, Response } from "express";
import { FormModel } from "../../models/FormsModel";
import { FormResponseModel } from "../../models/FormResponse";
import { getSocketInstance } from "../../config/socket";
import { emitNewNotification } from "../notifications/notificationController";
import ContactModel from "../../models/ContactModel";

export const getForms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para realizar esta acción" });
    }

    const forms = await FormModel.find({ organizationId })
      .populate("userId")
      .populate("organizationId");

    return res.status(200).json(forms);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los formularios", error });
  }
};

export const getForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    const formResponses = await FormResponseModel.find({
      formId: formId,
    }).populate("formId");

    if (!formResponses) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }

    return res.status(200).json(formResponses);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el formulario", error });
  }
};

// Crear un nuevo formulario
export const createForm = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para realizar esta acción" });
    }

    const { name, fields, createContact } = req.body;

    const newForm = new FormModel({
      organizationId,
      userId,
      name,
      fields,
      createContact,
    });

    await newForm.save();

    return res.status(201).json({
      message: "Formulario creado exitosamente",
      formId: newForm._id,
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json(error.message);
  }
};

// Recibir una respuesta de un formulario
let unreadFormCount = 0;

export const submitFormResponse = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    console.log("formId", formId);

    // Buscar el formulario por ID
    const form = await FormModel.findOne({ _id: formId });
    const token = req.query.token as string;

    if (!token) {
      return res.status(403).json({ message: "Token de seguridad faltante" });
    }

    if (!form) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }

    // Validar el token
    const tokenShouldBe = form.organizationId.toString();
    if (token !== tokenShouldBe) {
      return res.status(403).json({ message: "Token de seguridad inválido" });
    }

    // Validar que haya datos en el body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "El cuerpo de la solicitud está vacío" });
    }

    // Procesar los datos entrantes y mapearlos a los campos definidos en el formulario
    const processedResponses: any = {};

    form.fields.forEach((field) => {
      const fieldName = field.fieldName;

      // Intentamos buscar el valor en las posibles estructuras
      const value =
        req.body[fieldName] || // JSON
        req.body[`fields[${fieldName}][value]`] || // Elementor Forms estilo
        req.body[`fields.${fieldName}.value`]; // Posible otra estructura

      if (value !== undefined) {
        processedResponses[fieldName] = value;
      } else if (field.required) {
        return res
          .status(400)
          .json({ message: `Campo ${fieldName} es requerido.` });
      }
    });

    const { organizationId, userId } = form;

    if (!processedResponses) {
      return res
        .status(400)
        .json({ message: "No se han proporcionado respuestas válidas" });
    }

    const newResponse = new FormResponseModel({
      formId,
      organizationId,
      userId,
      responses: processedResponses, // Guardar solo los datos procesados
    });

    await newResponse.save();

    // Almacenar el contacto si savecontact es true
    if (form.createContact) {
      console.log(processedResponses);
      try {
        // Convertir processedResponses al formato que espera properties
        const properties = Object.entries(processedResponses).map(
          ([key, value]) => ({
            key,
            value,
          })
        );

        const contact = new ContactModel({
          organizationId,
          EmployeeOwner: userId,
          properties, // Se pasa el array transformado
        });

        await contact.save();
      } catch (error) {
        console.log(error);
      }
    }

    // Emitir una notificación para indicar que se ha recibido un nuevo formulario
    // emitNewNotification("form", organizationId, 1, form.name);

    return res
      .status(200)
      .json({ message: "Respuesta del formulario recibida exitosamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al recibir la respuesta", error });
  }
};

export const deleteForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    const form = await FormModel.find({ _id: formId });

    if (!form) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }

    await FormModel.deleteOne({ _id: formId });

    return res
      .status(200)
      .json({ message: "Formulario eliminado exitosamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el formulario", error });
  }
};

export const deleteFormResponses = async (req: Request, res: Response) => {
  try {
    const { responseIds } = req.body;

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No se han proporcionado IDs válidos" });
    }

    const responses = await FormResponseModel.find({
      _id: { $in: responseIds },
    });

    if (responses.length === 0) {
      return res.status(404).json({ message: "Respuestas no encontradas" });
    }

    await FormResponseModel.deleteMany({ _id: { $in: responseIds } });

    return res
      .status(200)
      .json({ message: "Respuestas eliminadas correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar las respuestas", error });
  }
};
