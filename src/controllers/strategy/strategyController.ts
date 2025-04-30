import { Request, Response } from "express";
import Strategy, { IStrategy } from "../../models/StrategyModel";
import mongoose from "mongoose";

// Obtener todas las estrategias de una organización
export const getStrategies = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "organizationId es requerido" });
    }

    const strategies = await Strategy.find({ organizationId });
    return res.status(200).json({ success: true, data: strategies });
  } catch (error) {
    console.error("Error al obtener estrategias:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al obtener estrategias" });
  }
};

// Obtener una estrategia específica
export const getStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID de estrategia inválido" });
    }

    const strategy = await Strategy.findById(id);

    if (!strategy) {
      return res
        .status(404)
        .json({ success: false, message: "Estrategia no encontrada" });
    }

    return res.status(200).json({ success: true, data: strategy });
  } catch (error) {
    console.error("Error al obtener estrategia:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al obtener estrategia" });
  }
};

// Crear una nueva estrategia
export const createStrategy = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?._id;
    const { name, description, funnel, audience } = req.body;

    if (!organizationId || !userId || !name) {
      return res.status(400).json({
        success: false,
        message: "organizationId, userId y name son campos requeridos",
      });
    }

    const newStrategy = new Strategy({
      organizationId,
      userId,
      name,
      description,
      funnel,
      audience,
    });

    const savedStrategy = await newStrategy.save();
    return res.status(201).json({ success: true, data: savedStrategy });
  } catch (error) {
    console.error("Error al crear estrategia:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al crear estrategia" });
  }
};

// Actualizar una estrategia
export const updateStrategy = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "organizationId es requerido" });
    }

    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID de estrategia inválido" });
    }

    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedStrategy) {
      return res
        .status(404)
        .json({ success: false, message: "Estrategia no encontrada" });
    }

    return res.status(200).json({ success: true, data: updatedStrategy });
  } catch (error) {
    console.error("Error al actualizar estrategia:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al actualizar estrategia" });
  }
};

// Eliminar una estrategia
export const deleteStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID de estrategia inválido" });
    }

    const deletedStrategy = await Strategy.findByIdAndDelete(id);

    if (!deletedStrategy) {
      return res
        .status(404)
        .json({ success: false, message: "Estrategia no encontrada" });
    }

    return res.status(200).json({
      success: true,
      message: "Estrategia eliminada correctamente",
      data: deletedStrategy,
    });
  } catch (error) {
    console.error("Error al eliminar estrategia:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al eliminar estrategia" });
  }
};
