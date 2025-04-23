// src/controllers/webhook/webhookAdminController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import WebhookEndpointModel from "../../models/WebhookEndpointModel";

/**
 * Obtiene todos los endpoints de webhook registrados para una organización
 */
export const getWebhookEndpoints = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res
      .status(401)
      .json({ message: "Organización no encontrada en el usuario" });
  }

  try {
    const endpoints = await WebhookEndpointModel.find({ organizationId });
    return res.status(200).json(endpoints);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener endpoints de webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Crea un nuevo endpoint de webhook
 */
export const createWebhookEndpoint = async (req: Request, res: Response) => {
  const { name, description, module, event, isActive = true } = req.body;
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res
      .status(401)
      .json({ message: "Organización no encontrada en el usuario" });
  }

  if (!name || !module || !event) {
    return res
      .status(400)
      .json({ message: "Nombre, módulo y evento son requeridos" });
  }

  try {
    // Generar token secreto para el webhook
    const secret = crypto.randomBytes(32).toString("hex");

    const endpoint = new WebhookEndpointModel({
      name,
      description,
      module,
      event,
      isActive,
      organizationId,
      createdBy: req.user?._id,
      secret,
    });

    await endpoint.save();

    return res.status(201).json(endpoint);
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear endpoint de webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Actualiza un endpoint de webhook existente
 */
export const updateWebhookEndpoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, module, event, isActive } = req.body;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "ID válido de organización y endpoint son requeridos" });
  }

  try {
    const endpoint = await WebhookEndpointModel.findOneAndUpdate(
      { _id: id, organizationId },
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(module && { module }),
        ...(event && { event }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    );

    if (!endpoint) {
      return res
        .status(404)
        .json({ message: "Endpoint de webhook no encontrado" });
    }

    return res.status(200).json(endpoint);
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar endpoint de webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Regenera el secreto de un endpoint de webhook
 */
export const regenerateWebhookSecret = async (req: Request, res: Response) => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "ID válido de organización y endpoint son requeridos" });
  }

  try {
    // Generar nuevo secreto
    const secret = crypto.randomBytes(32).toString("hex");

    const endpoint = await WebhookEndpointModel.findOneAndUpdate(
      { _id: id, organizationId },
      { secret, updatedAt: new Date() },
      { new: true }
    );

    if (!endpoint) {
      return res
        .status(404)
        .json({ message: "Endpoint de webhook no encontrado" });
    }

    return res.status(200).json(endpoint);
  } catch (error) {
    return res.status(500).json({
      message: "Error al regenerar secreto del webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Elimina un endpoint de webhook
 */
export const deleteWebhookEndpoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "ID válido de organización y endpoint son requeridos" });
  }

  try {
    const endpoint = await WebhookEndpointModel.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!endpoint) {
      return res
        .status(404)
        .json({ message: "Endpoint de webhook no encontrado" });
    }

    return res
      .status(200)
      .json({ message: "Endpoint de webhook eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar endpoint de webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
