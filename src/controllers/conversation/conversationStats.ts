import { Request, Response } from "express";
import Conversation from "../../models/ConversationModel";
import ConversationPipeline from "../../models/ConversationPipelineModel";
import { Types } from "mongoose";

/**
 * Obtiene estadísticas generales de conversaciones para la organización
 */
export const getConversationStats = async (
  req: Request & { organization?: any },
  res: Response
) => {
  try {
    const organizationId = req.organization;
    const { dateFrom, dateTo } = req.query;

    // Filtros de fecha
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.createdAt = { $gte: new Date(dateFrom as string) };
    }
    if (dateTo) {
      if (dateFilter.createdAt) {
        dateFilter.createdAt.$lte = new Date(dateTo as string);
      } else {
        dateFilter.createdAt = { $lte: new Date(dateTo as string) };
      }
    }

    const baseQuery = {
      organization: organizationId,
      ...dateFilter,
    };

    // Estadísticas generales
    const totalConversations = await Conversation.countDocuments(baseQuery);
    const resolvedConversations = await Conversation.countDocuments({
      ...baseQuery,
      isResolved: true,
    });
    const unassignedConversations = await Conversation.countDocuments({
      ...baseQuery,
      assignedTo: null,
    });

    // Promedio de tiempo de resolución (para conversaciones resueltas)
    const avgResolutionTime = await Conversation.aggregate([
      {
        $match: {
          ...baseQuery,
          isResolved: true,
          firstContactTimestamp: { $exists: true },
          updatedAt: { $exists: true },
        },
      },
      {
        $project: {
          resolutionTime: {
            $subtract: ["$updatedAt", "$firstContactTimestamp"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$resolutionTime" },
        },
      },
    ]);

    // Conversaciones por etapa y por pipeline
    const pipelineStats = await ConversationPipeline.aggregate([
      {
        $match: { organization: new Types.ObjectId(organizationId) },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          stages: 1,
        },
      },
      {
        $lookup: {
          from: "conversations",
          let: { pipelineId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$pipeline", "$$pipelineId"] },
                    {
                      $eq: [
                        "$organization",
                        new Types.ObjectId(organizationId),
                      ],
                    },
                  ],
                },
                ...dateFilter,
              },
            },
            {
              $group: {
                _id: "$currentStage",
                count: { $sum: 1 },
              },
            },
          ],
          as: "stageStats",
        },
      },
    ]);

    // Estadísticas por prioridad
    const priorityStats = await Conversation.aggregate([
      {
        $match: baseQuery,
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    // Estadísticas por usuario asignado
    const assigneeStats = await Conversation.aggregate([
      {
        $match: {
          ...baseQuery,
          assignedTo: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$isResolved", true] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          resolvedCount: 1,
          "user.name": 1,
          "user.email": 1,
        },
      },
    ]);

    // Formatear los resultados
    const formattedPipelineStats = pipelineStats.map((pipeline) => {
      const stageData = pipeline.stages.map((stage: any) => {
        const stageStats = pipeline.stageStats.find(
          (s: any) => s._id === stage.order
        );
        return {
          stageId: stage._id,
          stageName: stage.name,
          count: stageStats ? stageStats.count : 0,
        };
      });

      return {
        pipelineId: pipeline._id,
        pipelineName: pipeline.name,
        stages: stageData,
        totalConversations: stageData.reduce(
          (sum: number, stage: any) => sum + stage.count,
          0
        ),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalConversations,
        resolvedConversations,
        unassignedConversations,
        resolutionTime:
          avgResolutionTime.length > 0 ? avgResolutionTime[0].avgTime : 0,
        pipelineStats: formattedPipelineStats,
        priorityStats: priorityStats.reduce((result: any, stat: any) => {
          result[stat._id] = stat.count;
          return result;
        }, {}),
        assigneeStats,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener estadísticas de conversaciones:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de conversaciones",
      error: error.message,
    });
  }
};
