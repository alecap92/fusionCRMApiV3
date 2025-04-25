import { Request, Response } from "express";
import ScoringRuleModel from "../../models/ScoringRuleModel";
import { IAuthRequest } from "../../types";

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
