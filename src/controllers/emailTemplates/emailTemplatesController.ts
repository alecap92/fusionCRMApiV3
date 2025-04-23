import { Request, Response } from "express";
import EmailTemplateModel from "../../models/EmailTemplates";

// ✅ Crear una nueva plantilla de correo
export const createEmailTemplate = async (req: Request, res: Response) => {
  console.log("create");
  try {
    const organizationId = req.user?.organizationId;
    const createdBy = req.user?._id;

    const { name, emailJson, emailHtml } = req.body;

    if (!name || !emailJson || !emailHtml) {
      return res
        .status(400)
        .json({ message: "Todos los campos obligatorios deben ser llenados" });
    }

    const newEmailTemplate = new EmailTemplateModel({
      name,
      emailJson,
      emailHtml,
      organizationId,
      createdBy,
      createdAt: new Date(),
    });

    await newEmailTemplate.save();
    res.status(201).json({
      message: "Plantilla de correo creada exitosamente",
      template: newEmailTemplate,
    });
  } catch (error) {
    console.error("Error creando plantilla de correo:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};

// ✅ Obtener todas las plantillas con paginación
export const getEmailTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const templates = await EmailTemplateModel.find({ organizationId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("userId");
    if (!templates) {
      return res
        .status(404)
        .json({ message: "No se encontraron plantillas de correo" });
    }

    const total = await EmailTemplateModel.countDocuments({ organizationId });

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      templates,
    });
  } catch (error) {
    console.error("Error obteniendo plantillas de correo:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};

// ✅ Obtener una plantilla por ID
export const getEmailTemplateById = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const template = await EmailTemplateModel.findOne({
      _id: id,
      organizationId,
    });

    if (!template) {
      return res
        .status(404)
        .json({ message: "Plantilla de correo no encontrada" });
    }

    res.status(200).json(template);
  } catch (error) {
    console.error("Error obteniendo plantilla de correo:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};

// ✅ Actualizar una plantilla de correo
export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { name, emailJson, emailHtml } = req.body;

    const existingTemplate = await EmailTemplateModel.findOne({
      _id: id,
      organizationId,
    });

    if (!existingTemplate) {
      return res
        .status(404)
        .json({ message: "Plantilla de correo no encontrada" });
    }

    existingTemplate.name = name ?? existingTemplate.name;
    existingTemplate.emailJson = emailJson ?? existingTemplate.emailJson;
    existingTemplate.emailHtml = emailHtml ?? existingTemplate.emailHtml;

    await existingTemplate.save();

    res.status(200).json({
      message: "Plantilla de correo actualizada",
      template: existingTemplate,
    });
  } catch (error) {
    console.error("Error actualizando plantilla de correo:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};

// ✅ Eliminar una plantilla de correo
export const deleteEmailTemplate = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const deletedTemplate = await EmailTemplateModel.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!deletedTemplate) {
      return res
        .status(404)
        .json({ message: "Plantilla de correo no encontrada" });
    }

    res
      .status(200)
      .json({ message: "Plantilla de correo eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando plantilla de correo:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};
