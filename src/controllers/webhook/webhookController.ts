// src/controllers/webhook/webhookController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import AutomationModel from "../../models/AutomationModel";
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

  logger.info(`Webhook recibido: ${module}/${event}`, {
    module,
    event,
    organizationId,
    payloadSample: JSON.stringify(payload).substring(0, 200), // Muestra parte del payload para debug
  });

  if (!module || !event) {
    return res.status(400).json({ message: "Módulo y evento son requeridos" });
  }

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    return res.status(400).json({
      message:
        "ID de organización válido es requerido en el header 'x-organization-id'",
    });
  }

  try {
    // Buscar automatizaciones activas que coincidan con este evento
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

    logger.info(
      `Encontradas ${automations.length} automatizaciones que coinciden con ${module}/${event}`,
      {
        organizationId,
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
