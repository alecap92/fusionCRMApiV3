import { Request, Response } from "express";
import { AutomationService } from "../../services/conversations/automationService";

/**
 * Pausa las automatizaciones para una conversación
 */
export const pauseAutomations = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body;
    const userId = req.user?._id;

    if (!duration) {
      return res.status(400).json({
        success: false,
        message: "La duración es requerida",
      });
    }

    const validDurations = ["30m", "1h", "3h", "6h", "12h", "1d", "forever"];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        success: false,
        message: "Duración inválida",
      });
    }

    const conversation = await AutomationService.pauseAutomations({
      conversationId,
      duration,
      userId,
    });

    res.json({
      success: true,
      message: "Automatizaciones pausadas exitosamente",
      data: {
        automationSettings: conversation.automationSettings,
      },
    });
  } catch (error) {
    console.error("Error pausando automatizaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Reanuda las automatizaciones para una conversación
 */
export const resumeAutomations = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await AutomationService.resumeAutomations(
      conversationId,
      userId
    );

    res.json({
      success: true,
      message: "Automatizaciones reanudadas exitosamente",
      data: {
        automationSettings: conversation.automationSettings,
      },
    });
  } catch (error) {
    console.error("Error reanudando automatizaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Obtiene el estado de automatizaciones de una conversación
 */
export const getAutomationStatus = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const isActive =
      await AutomationService.areAutomationsActive(conversationId);

    res.json({
      success: true,
      data: {
        isActive,
      },
    });
  } catch (error) {
    console.error("Error obteniendo estado de automatizaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Obtiene el historial de automatizaciones de una conversación
 */
export const getAutomationHistory = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const history =
      await AutomationService.getAutomationHistory(conversationId);

    res.json({
      success: true,
      data: {
        history,
      },
    });
  } catch (error) {
    console.error("Error obteniendo historial de automatizaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Verifica si una automatización específica puede ejecutarse
 */
export const canTriggerAutomation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { automationType } = req.query;

    if (!automationType || typeof automationType !== "string") {
      return res.status(400).json({
        success: false,
        message: "El tipo de automatización es requerido",
      });
    }

    const canTrigger = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType,
    });

    res.json({
      success: true,
      data: {
        canTrigger,
      },
    });
  } catch (error) {
    console.error("Error verificando automatización:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
