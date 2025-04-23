// src/controllers/execution/executionLogController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import ExecutionLogModel from "../../models/ExecutionLogModel";

/**
 * Obtener logs de ejecución con filtros
 */
export const getExecutionLogs = async (req: Request, res: Response) => {
  try {
    const {
      automationId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const queryOptions: any = {
      organizationId: new mongoose.Types.ObjectId(req.user?.organizationId),
    };

    // Aplicar filtros si existen
    if (automationId) {
      queryOptions.automationId = new mongoose.Types.ObjectId(
        automationId as string
      );
    }

    if (status && status !== "all") {
      queryOptions.status = status;
    }

    // Filtros de fecha
    if (startDate || endDate) {
      queryOptions.startTime = {};
      if (startDate) {
        queryOptions.startTime.$gte = new Date(startDate as string);
      }
      if (endDate) {
        queryOptions.startTime.$lte = new Date(endDate as string);
      }
    }

    // Calcular paginación
    const skip = (Number(page) - 1) * Number(limit);

    // Obtener total de documentos
    const total = await ExecutionLogModel.countDocuments(queryOptions);

    // Obtener logs paginados
    const logs = await ExecutionLogModel.find(queryOptions)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      data: logs,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    console.error("Error al obtener logs de ejecución:", error);
    return res.status(500).json({
      message: "Error al obtener logs de ejecución",
      error: error.message,
    });
  }
};

/**
 * Obtener detalle de una ejecución específica
 */
export const getExecutionDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await ExecutionLogModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(req.user?.organizationId),
    }).lean();

    if (!log) {
      return res
        .status(404)
        .json({ message: "Log de ejecución no encontrado" });
    }

    return res.status(200).json({ data: log });
  } catch (error: any) {
    console.error("Error al obtener detalle de ejecución:", error);
    return res.status(500).json({
      message: "Error al obtener detalle de ejecución",
      error: error.message,
    });
  }
};

/**
 * Obtener estadísticas de ejecuciones
 */
export const getExecutionStats = async (req: Request, res: Response) => {
  try {
    const { automationId, startDate, endDate } = req.query;

    const matchStage: any = {
      organizationId: new mongoose.Types.ObjectId(req.user?.organizationId),
    };

    // Aplicar filtros si existen
    if (automationId) {
      matchStage.automationId = new mongoose.Types.ObjectId(
        automationId as string
      );
    }

    // Filtros de fecha
    if (startDate || endDate) {
      matchStage.startTime = {};
      if (startDate) {
        matchStage.startTime.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchStage.startTime.$lte = new Date(endDate as string);
      }
    } else {
      // Por defecto, estadísticas de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.startTime = { $gte: thirtyDaysAgo };
    }

    // Pipeline para estadísticas
    const [stats] = await ExecutionLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
          totalDuration: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "success"] },
                    { $ne: ["$endTime", null] },
                  ],
                },
                { $subtract: ["$endTime", "$startTime"] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          success: 1,
          failed: 1,
          inProgress: 1,
          averageDuration: {
            $cond: [
              { $eq: ["$success", 0] },
              0,
              { $divide: ["$totalDuration", "$success"] },
            ],
          },
        },
      },
    ]);

    // Pipeline para estadísticas por día
    const byDay = await ExecutionLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
            day: { $dayOfMonth: "$startTime" },
          },
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          },
          total: 1,
          success: 1,
          failed: 1,
        },
      },
    ]);

    return res.status(200).json({
      data: {
        ...(stats || {
          total: 0,
          success: 0,
          failed: 0,
          inProgress: 0,
          averageDuration: 0,
        }),
        byDay,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener estadísticas de ejecución:", error);
    return res.status(500).json({
      message: "Error al obtener estadísticas de ejecución",
      error: error.message,
    });
  }
};

/**
 * Obtener detalles de error de una ejecución
 */
export const getExecutionError = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await ExecutionLogModel.findOne(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(req.user?.organizationId),
        status: "failed",
      },
      {
        error: 1,
        nodesExecution: 1,
      }
    ).lean();

    if (!log) {
      return res
        .status(404)
        .json({ message: "Log de ejecución fallida no encontrado" });
    }

    return res.status(200).json({
      data: {
        error: log.error,
        logs: log,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener detalles de error:", error);
    return res.status(500).json({
      message: "Error al obtener detalles de error",
      error: error.message,
    });
  }
};
