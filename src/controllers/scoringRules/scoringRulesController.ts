import { Request, Response } from "express";
import ScoringRuleModel from "../../models/ScoringRuleModel";
import { IAuthRequest } from "../../types";
import {
  recalculateAllLeadScores,
  recalculateContactScore,
} from "../../utils/leadScoring";

// Caché simple para almacenar estados de trabajos de recálculo
const recalculationJobs = new Map<
  string,
  {
    status: "processing" | "completed" | "failed";
    organizationId: string;
    startTime: number;
    endTime?: number;
    error?: string;
  }
>();

/**
 * Obtener todas las reglas de puntuación de una organización
 */
export const getAllScoringRules = async (req: IAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const rules = await ScoringRuleModel.find({ organizationId });

    res.json(rules);
  } catch (error: any) {
    console.error("Error al obtener reglas de puntuación:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener reglas de puntuación",
      error: error.message,
    });
  }
};

/**
 * Obtener una regla de puntuación específica
 */
export const getScoringRuleById = async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const rule = await ScoringRuleModel.findOne({
      _id: id,
      organizationId,
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Regla de puntuación no encontrada",
      });
    }

    res.json(rule);
  } catch (error: any) {
    console.error("Error al obtener regla de puntuación:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener regla de puntuación",
      error: error.message,
    });
  }
};

/**
 * Crear una nueva regla de puntuación
 */
export const createScoringRule = async (req: IAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const { name, description, conditions } = req.body;

    // Validar datos mínimos
    if (!name || !conditions || !Array.isArray(conditions)) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos. Se requiere nombre y reglas (array)",
      });
    }

    // Crear nueva regla
    const newRule = new ScoringRuleModel({
      organizationId,
      name,
      description,
      isActive: true,
      rules: conditions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newRule.save();

    res.status(201).json({
      success: true,
      message: "Regla de puntuación creada correctamente",
      data: newRule,
    });
  } catch (error: any) {
    console.error("Error al crear regla de puntuación:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear regla de puntuación",
      error: error.message,
    });
  }
};

/**
 * Actualizar una regla de puntuación existente
 */
export const updateScoringRule = async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const { name, description, isActive, rules } = req.body;

    // Verificar que la regla existe y pertenece a la organización
    const existingRule = await ScoringRuleModel.findOne({
      _id: id,
      organizationId,
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: "Regla de puntuación no encontrada",
      });
    }

    // Actualizar campos
    if (name) existingRule.name = name;
    if (description !== undefined) existingRule.description = description;
    if (isActive !== undefined) existingRule.isActive = isActive;
    if (rules && Array.isArray(rules)) existingRule.rules = rules;

    existingRule.updatedAt = new Date();

    await existingRule.save();

    res.json({
      success: true,
      message: "Regla de puntuación actualizada correctamente",
      data: existingRule,
    });
  } catch (error: any) {
    console.error("Error al actualizar regla de puntuación:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar regla de puntuación",
      error: error.message,
    });
  }
};

/**
 * Eliminar una regla de puntuación
 */
export const deleteScoringRule = async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const result = await ScoringRuleModel.deleteOne({
      _id: id,
      organizationId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Regla de puntuación no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Regla de puntuación eliminada correctamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar regla de puntuación:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar regla de puntuación",
      error: error.message,
    });
  }
};

/**
 * Recalcula los puntajes de todos los contactos de la organización
 * Esta versión inicia el proceso en segundo plano y responde inmediatamente
 */
export const recalculateScores = async (req: IAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    const jobId = `recalc_${organizationId}_${Date.now()}`;

    // Guardar el estado inicial del trabajo
    recalculationJobs.set(jobId, {
      status: "processing",
      organizationId,
      startTime: Date.now(),
    });

    // Responder inmediatamente al cliente
    res.json({
      success: true,
      message: "Recálculo de puntajes iniciado en segundo plano",
      jobId,
      status: "processing",
    });

    // Ejecutar el proceso en segundo plano
    console.log(
      `[JobID: ${jobId}] Iniciando recálculo de puntajes para organización ${organizationId}`
    );

    // Iniciar el proceso de recálculo sin esperar a que termine
    recalculateAllLeadScores(organizationId)
      .then(() => {
        const endTime = Date.now();
        const executionTime = endTime - recalculationJobs.get(jobId)!.startTime;

        // Actualizar el estado del trabajo
        recalculationJobs.set(jobId, {
          ...recalculationJobs.get(jobId)!,
          status: "completed",
          endTime,
        });

        console.log(
          `[JobID: ${jobId}] Recálculo completado en ${executionTime}ms`
        );
      })
      .catch((error) => {
        // Actualizar el estado del trabajo con el error
        recalculationJobs.set(jobId, {
          ...recalculationJobs.get(jobId)!,
          status: "failed",
          endTime: Date.now(),
          error: error.message,
        });

        console.error(`[JobID: ${jobId}] Error al recalcular puntajes:`, error);
      });
  } catch (error: any) {
    console.error("Error al iniciar recálculo de puntajes:", error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar recálculo de puntajes",
      error: error.message,
    });
  }
};

/**
 * Recalcula los puntajes de un contacto específico
 */
export const recalculateContactScores = async (
  req: IAuthRequest,
  res: Response
) => {
  try {
    const { contactId } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    // Iniciar el proceso de recálculo sin esperar a que termine
    recalculateContactScore(contactId, organizationId)
      .then((score) => {
        res.json({
          success: true,
          message: "Recálculo de puntajes completado correctamente",
          score,
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error al recalcular puntajes",
          error: error.message,
        });
      });
  } catch (error: any) {
    console.error("Error al iniciar recálculo de puntajes:", error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar recálculo de puntajes",
      error: error.message,
    });
  }
};

/**
 * Obtiene el estado del trabajo de recálculo de puntajes
 */
export const getRecalculationStatus = async (
  req: IAuthRequest,
  res: Response
) => {
  try {
    const { jobId } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "ID de organización no disponible",
      });
    }

    // Obtener el estado del trabajo de la caché
    const jobInfo = recalculationJobs.get(jobId);

    if (!jobInfo) {
      return res.status(404).json({
        success: false,
        message: "Trabajo de recálculo no encontrado",
        jobId,
      });
    }

    // Verificar que el trabajo pertenece a la organización del usuario
    if (jobInfo.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "No tiene permiso para acceder a este trabajo de recálculo",
      });
    }

    // Respuesta según el estado del trabajo
    const response: any = {
      success: true,
      jobId,
      status: jobInfo.status,
      startTime: new Date(jobInfo.startTime).toISOString(),
    };

    if (jobInfo.endTime) {
      response.endTime = new Date(jobInfo.endTime).toISOString();
      response.executionTime = `${jobInfo.endTime - jobInfo.startTime}ms`;
    }

    if (jobInfo.error) {
      response.error = jobInfo.error;
    }

    if (jobInfo.status === "completed") {
      response.message = "El proceso de recálculo ha finalizado correctamente";
    } else if (jobInfo.status === "failed") {
      response.message = "El proceso de recálculo ha fallado";
    } else {
      response.message = "El proceso de recálculo está en curso";
    }

    res.json(response);
  } catch (error: any) {
    console.error("Error al obtener estado de recálculo:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estado de recálculo",
      error: error.message,
    });
  }
};
