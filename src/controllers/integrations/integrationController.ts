import { Request, Response } from "express";
import mongoose from "mongoose";
import IntegrationsModel from "../../models/IntegrationsModel";

// 🧠 Validar ID válido
const isValidObjectId = (id: any) => mongoose.Types.ObjectId.isValid(id);

// 🔍 Obtener todas las integraciones de la organización
export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const integrations = await IntegrationsModel.find({ organizationId });
    res.status(200).json(integrations);
  } catch (error) {
    console.error("Error al obtener integraciones:", error);
    res.status(500).json({ message: "Error al obtener integraciones" });
  }
};

// 🔍 Obtener una integración específica
export const getIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "ID inválido" });

    const integration = await IntegrationsModel.findById(id);
    if (!integration)
      return res.status(404).json({ message: "Integración no encontrada" });

    res.status(200).json(integration);
  } catch (error) {
    console.error("Error al obtener la integración:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ➕ Crear nueva integración
export const createIntegration = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { service, credentials, settings, name } = req.body;

    if (!service || !credentials) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // Evitar duplicados por tipo
    const exists = await IntegrationsModel.findOne({ organizationId, service });
    if (exists) {
      return res
        .status(400)
        .json({ message: `Ya existe una integración para ${service}` });
    }

    const integration = new IntegrationsModel({
      organizationId,
      service,
      credentials,
      settings,
      name,
    });

    await integration.save();
    res.status(201).json(integration);
  } catch (error) {
    console.error("Error al crear la integración:", error);
    res.status(500).json({ message: "Error al crear integración" });
  }
};

// ✏️ Actualizar integración
export const updateIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "ID inválido" });

    const integration = await IntegrationsModel.findById(id);
    if (!integration)
      return res.status(404).json({ message: "Integración no encontrada" });

    const { credentials, settings, isActive, name } = req.body;

    if (credentials) integration.credentials = credentials;
    if (settings) integration.settings = settings;
    if (typeof isActive === "boolean") integration.isActive = isActive;
    if (name) integration.name = name;

    await integration.save();
    res.status(200).json(integration);
  } catch (error) {
    console.error("Error al actualizar integración:", error);
    res.status(500).json({ message: "Error al actualizar integración" });
  }
};

// ❌ Eliminar integración
export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "ID inválido" });

    const deleted = await IntegrationsModel.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Integración no encontrada" });

    res.status(200).json({ message: "Integración eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar integración:", error);
    res.status(500).json({ message: "Error al eliminar integración" });
  }
};
