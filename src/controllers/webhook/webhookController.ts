// src/controllers/webhook/webhookController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import AutomationModel from "../../models/AutomationModel";
import WebhookEndpointModel from "../../models/WebhookEndpointModel";
import { automationExecutionService } from "../../services/automation/automationExecutionService";
import logger from "../../utils/logger";

/**
 * Maneja los webhooks entrantes que pueden disparar automatizaciones
 * @route POST /api/v1/webhooks/:module/:event
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const { module, event } = req.params;
  const payload = req.body;
  const organizationId = req.headers["x-organization-id"] as string;
  const providedSecret = req.headers["x-webhook-secret"] as string;

  logger.info(`Webhook recibido: ${module}/${event}`, {
    module,
    event,
    organizationId,
    hasSecret: !!providedSecret,
    payloadSample: JSON.stringify(payload).substring(0, 200), // Muestra parte del payload para debug
  });

  if (!module || !event) {
    return res.status(400).json({ message: "Módulo y evento son requeridos" });
  }

  try {
    let targetOrganizationId = organizationId;
    
    // Si se proporciona un secreto, intentar encontrar el webhook por módulo, evento y secreto
    if (providedSecret && !targetOrganizationId) {
      const webhookEndpoint = await WebhookEndpointModel.findOne({
        module,
        event,
        secret: providedSecret,
        isActive: true
      });
      
      if (webhookEndpoint) {
        targetOrganizationId = webhookEndpoint.organizationId?.toString();
        logger.info(`Webhook identificado por secreto: ${module}/${event}`, {
          webhookId: webhookEndpoint._id?.toString(),
          organizationId: targetOrganizationId
        });
      }
    }

    if (!targetOrganizationId || !mongoose.Types.ObjectId.isValid(targetOrganizationId)) {
      return res.status(400).json({
        message:
          "ID de organización válido es requerido en el header 'x-organization-id' o un secreto válido en 'x-webhook-secret'",
      });
    }

    // Buscar automatizaciones activas que coincidan con este evento
    const automations = await AutomationModel.find({
      organizationId: targetOrganizationId,
      isActive: true,
      nodes: {
        $elemMatch: {
          type: "trigger",
          module,
          event,
        },
      },
    });

    logger.info(
      `Encontradas ${automations.length} automatizaciones que coinciden con ${module}/${event}`,
      {
        organizationId: targetOrganizationId,
        automationIds: automations.map((a: any) => a._id.toString()),
      }
    );

    if (automations.length === 0) {
      return res.status(200).json({
        message: "No se encontraron automatizaciones para este evento",
        automationsTriggered: 0,
      });
    }

    // Verificar y ejecutar cada automatización que coincida
    const executionPromises = automations.map((automation) => {
      // Encontrar el nodo trigger específico que coincide
      const triggerNode = automation.nodes.find(
        (node) =>
          node.type === "trigger" &&
          node.module === module &&
          node.event === event
      );

      // Si el nodo tiene payloadMatch, verificar que coincide
      if (triggerNode?.payloadMatch) {
        const matches = Object.entries(triggerNode.payloadMatch).every(
          ([key, value]) => {
            // Navegar por la ruta de propiedades anidadas para obtener el valor
            const payloadValue = key
              .split(".")
              .reduce((obj, prop) => obj && obj[prop], payload);

            // Comparar el valor (considerando posibles RegExp)
            if (
              typeof value === "string" &&
              value.startsWith("/") &&
              value.endsWith("/")
            ) {
              // Es una expresión regular (formato: "/pattern/")
              const pattern = value.slice(1, -1);
              const regex = new RegExp(pattern);
              return regex.test(String(payloadValue));
            }

            return payloadValue === value;
          }
        );

        if (!matches) {
          logger.info(
            `Automatización ${automation._id} no coincide con payloadMatch`,
            {
              triggerNode: triggerNode.id,
              payloadMatch: triggerNode.payloadMatch,
            }
          );
          return null; // No ejecutar esta automatización
        }
      }

      logger.info(`Ejecutando automatización ${automation._id} por webhook`);

      // Iniciar la ejecución y devolver el ID
      return automationExecutionService.executeAutomation(
        automation as any,
        payload,
        new mongoose.Types.ObjectId().toString()
      );
    });

    // Filtrar promesas nulas (automatizaciones que no coinciden) y ejecutar todas
    const validPromises = executionPromises.filter(
      (p) => p !== null
    ) as Promise<string>[];
    const executionIds = await Promise.all(validPromises);

    return res.status(200).json({
      message: "Webhook procesado correctamente",
      automationsTriggered: executionIds.length,
      executionIds,
    });
  } catch (error) {
    logger.error("Error al procesar webhook", {
      error: error instanceof Error ? error.message : String(error),
      module,
      event,
      organizationId,
    });

    return res.status(500).json({
      message: "Error al procesar el webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Maneja los webhooks entrantes utilizando un ID único
 * @route POST /api/v1/webhooks/id/:uniqueId
 */
export const handleWebhookById = async (req: Request, res: Response) => {
  const { uniqueId } = req.params;
  const payload = req.body;
  // Obtener el secreto desde el header, si está presente
  const providedSecret = req.headers["x-webhook-secret"] as string;

  logger.info(`Webhook recibido por ID único: ${uniqueId}`, {
    uniqueId,
    payloadSample: JSON.stringify(payload).substring(0, 200), // Muestra parte del payload para debug
    hasSecret: !!providedSecret
  });

  if (!uniqueId) {
    return res.status(400).json({ message: "ID único del webhook es requerido" });
  }

  try {
    // Buscar el endpoint de webhook por su ID único
    const webhookEndpoint = await WebhookEndpointModel.findOne({ 
      uniqueId,
      isActive: true
    });

    logger.info(`Búsqueda de webhook con uniqueId: ${uniqueId}, resultado:`, {
      encontrado: !!webhookEndpoint,
      webhookEndpointId: webhookEndpoint?._id?.toString(),
    });

    if (!webhookEndpoint) {
      return res.status(404).json({
        message: "Webhook no encontrado o no está activo",
      });
    }

    // Verificar el secreto si se proporciona
    if (providedSecret && webhookEndpoint.secret !== providedSecret) {
      logger.warn(`Secreto de webhook inválido para ${uniqueId}`, {
        uniqueId,
        webhookId: webhookEndpoint._id?.toString(),
      });
      
      return res.status(401).json({
        message: "Secreto de webhook inválido"
      });
    }

    const { module, event, organizationId } = webhookEndpoint;

    // Loguear más información para diagnóstico
    logger.info(`Datos del webhook encontrado: module=${module}, event=${event}, orgId=${organizationId}`, {
      uniqueId,
      module,
      event,
      organizationId: organizationId?.toString(),
    });

    // Buscar automatizaciones activas que coincidan con este módulo y evento
    const automations = await AutomationModel.find({
      organizationId,
      isActive: true,
      nodes: {
        $elemMatch: {
          type: "trigger",
          module,
          event,
        },
      },
    });

    // Loguear la consulta para diagnóstico
    logger.info(`Consulta de automatizaciones: ${JSON.stringify({
      organizationId: organizationId?.toString(),
      isActive: true,
      "nodes.type": "trigger",
      "nodes.module": module,
      "nodes.event": event,
    })}`);

    logger.info(
      `Encontradas ${automations.length} automatizaciones que coinciden con webhook ${uniqueId} (${module}/${event})`,
      {
        organizationId: organizationId?.toString(),
        automationIds: automations.map((a: any) => a._id.toString()),
      }
    );

    if (automations.length === 0) {
      return res.status(200).json({
        message: "No se encontraron automatizaciones para este webhook",
        automationsTriggered: 0,
        webhookInfo: {
          module,
          event,
          organizationId: organizationId?.toString()
        }
      });
    }

    // Verificar y ejecutar cada automatización que coincida
    const executionPromises = automations.map((automation) => {
      // Encontrar el nodo trigger específico que coincide
      const triggerNode = automation.nodes.find(
        (node) =>
          node.type === "trigger" &&
          node.module === module &&
          node.event === event
      );

      // Si el nodo tiene payloadMatch, verificar que coincide
      if (triggerNode?.payloadMatch) {
        const matches = Object.entries(triggerNode.payloadMatch).every(
          ([key, value]) => {
            // Navegar por la ruta de propiedades anidadas para obtener el valor
            const payloadValue = key
              .split(".")
              .reduce((obj, prop) => obj && obj[prop], payload);

            // Comparar el valor (considerando posibles RegExp)
            if (
              typeof value === "string" &&
              value.startsWith("/") &&
              value.endsWith("/")
            ) {
              // Es una expresión regular (formato: "/pattern/")
              const pattern = value.slice(1, -1);
              const regex = new RegExp(pattern);
              return regex.test(String(payloadValue));
            }

            return payloadValue === value;
          }
        );

        if (!matches) {
          logger.info(
            `Automatización ${automation._id} no coincide con payloadMatch`,
            {
              triggerNode: triggerNode.id,
              payloadMatch: triggerNode.payloadMatch,
            }
          );
          return null; // No ejecutar esta automatización
        }
      }

      logger.info(`Ejecutando automatización ${automation._id} por webhook con ID: ${uniqueId}`);

      // Iniciar la ejecución y devolver el ID
      return automationExecutionService.executeAutomation(
        automation as any,
        payload,
        new mongoose.Types.ObjectId().toString()
      );
    });

    // Filtrar promesas nulas (automatizaciones que no coinciden) y ejecutar todas
    const validPromises = executionPromises.filter(
      (p) => p !== null
    ) as Promise<string>[];
    const executionIds = await Promise.all(validPromises);

    return res.status(200).json({
      message: "Webhook procesado correctamente",
      automationsTriggered: executionIds.length,
      executionIds,
    });
  } catch (error) {
    logger.error("Error al procesar webhook por ID", {
      error: error instanceof Error ? error.message : String(error),
      uniqueId,
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      message: "Error al procesar el webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Verifica que un webhook sea válido (usado para verificación inicial con plataformas externas)
 * @route GET /api/v1/webhooks/:module/:event
 */
export const verifyWebhook = (req: Request, res: Response) => {
  const { module, event } = req.params;
  const challenge = req.query.challenge || req.query.hub_challenge;
  const verifyToken = req.query.verify_token || req.query.hub_verify_token;

  // Si es una verificación de webhook (común en plataformas como Facebook, Stripe, etc.)
  if (challenge && verifyToken) {
    // Verificar que el token coincide con el configurado
    if (verifyToken === process.env.WEBHOOK_VERIFY_TOKEN) {
      logger.info(`Verificación de webhook exitosa para ${module}/${event}`);
      return res.status(200).send(challenge);
    }

    logger.warn(
      `Verificación de webhook fallida para ${module}/${event} - Token inválido`
    );
    return res.status(401).json({ message: "Token de verificación inválido" });
  }

  // Si es una solicitud normal de verificación de disponibilidad
  return res.status(200).json({
    message: `Endpoint de webhook disponible para ${module}/${event}`,
    module,
    event,
  });
};

/**
 * Verifica que un webhook sea válido utilizando su ID único
 * @route GET /api/v1/webhooks/id/:uniqueId
 */
export const verifyWebhookById = async (req: Request, res: Response) => {
  const { uniqueId } = req.params;
  const challenge = req.query.challenge || req.query.hub_challenge;
  const verifyToken = req.query.verify_token || req.query.hub_verify_token;

  try {
    // Buscar el endpoint de webhook por su ID único
    const webhookEndpoint = await WebhookEndpointModel.findOne({ uniqueId });

    if (!webhookEndpoint) {
      return res.status(404).json({
        message: "Webhook no encontrado",
      });
    }

    const { module, event, isActive } = webhookEndpoint;

    // Si es una verificación de webhook (común en plataformas como Facebook, Stripe, etc.)
    if (challenge && verifyToken) {
      // Verificar que el token coincide con el configurado
      if (verifyToken === process.env.WEBHOOK_VERIFY_TOKEN) {
        logger.info(`Verificación de webhook exitosa para ID: ${uniqueId}`);
        return res.status(200).send(challenge);
      }

      logger.warn(
        `Verificación de webhook fallida para ID: ${uniqueId} - Token inválido`
      );
      return res.status(401).json({ message: "Token de verificación inválido" });
    }

    // Si es una solicitud normal de verificación de disponibilidad
    return res.status(200).json({
      message: `Endpoint de webhook disponible para ID: ${uniqueId}`,
      uniqueId,
      module,
      event,
      isActive
    });
  } catch (error) {
    logger.error("Error al verificar webhook por ID", {
      error: error instanceof Error ? error.message : String(error),
      uniqueId,
    });

    return res.status(500).json({
      message: "Error al verificar el webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
