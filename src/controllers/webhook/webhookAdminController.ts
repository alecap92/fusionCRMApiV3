// src/controllers/webhook/webhookAdminController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
// import { nanoid } from 'nanoid'; // Reemplazando esta importación
import WebhookEndpointModel from "../../models/WebhookEndpointModel";

// Función auxiliar para nanoid como importación dinámica
const generateNanoId = async (size = 10) => {
  const { nanoid } = await import('nanoid');
  return nanoid(size);
};

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
    // Obtener todos los endpoints y añadir la URL completa
    const endpoints = await WebhookEndpointModel.find({ organizationId });
    
    // Añadir la URL completa a cada endpoint
    const endpointsWithUrl = endpoints.map(endpoint => {
      const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;
      return {
        ...endpoint.toObject(),
        fullUrl: webhookUrl
      };
    });
    
    return res.status(200).json(endpointsWithUrl);
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
  const { name, description, module, event, isActive = true, organizationId, createdBy } = req.body;

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
    
    // Generar un ID único para el webhook (10 caracteres) con importación dinámica
    const uniqueId = await generateNanoId(10);

    const endpoint = new WebhookEndpointModel({
      name,
      description,
      module,
      event,
      isActive,
      organizationId,
      createdBy,
      secret,
      uniqueId,
    });

    await endpoint.save();

    // Construir la URL completa del webhook
    const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${uniqueId}`;

    // Devolver el endpoint con la URL completa
    return res.status(201).json({
      ...endpoint.toObject(),
      fullUrl: webhookUrl
    });
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
  const { name, description, module, event, isActive, uniqueId } = req.body;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "ID válido de organización y endpoint son requeridos" });
  }

  try {
    // Crear un objeto con los campos a actualizar
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (module) updateFields.module = module;
    if (event) updateFields.event = event;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (uniqueId) updateFields.uniqueId = uniqueId; // Actualizar uniqueId si se proporciona

    const endpoint = await WebhookEndpointModel.findOneAndUpdate(
      { _id: id, organizationId },
      updateFields,
      { new: true }
    );

    if (!endpoint) {
      return res
        .status(404)
        .json({ message: "Endpoint de webhook no encontrado" });
    }

    // Construir la URL completa del webhook
    const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;

    // Devolver el endpoint con la URL completa
    return res.status(200).json({
      ...endpoint.toObject(),
      fullUrl: webhookUrl
    });
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

    // Construir la URL completa del webhook
    const webhookUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/webhooks/id/${endpoint.uniqueId}`;

    // Devolver el endpoint con la URL completa
    return res.status(200).json({
      ...endpoint.toObject(),
      fullUrl: webhookUrl
    });
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
