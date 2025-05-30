"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationStats = void 0;
const ConversationModel_1 = __importDefault(require("../../models/ConversationModel"));
const ConversationPipelineModel_1 = __importDefault(require("../../models/ConversationPipelineModel"));
const mongoose_1 = require("mongoose");
/**
 * Obtiene estadísticas generales de conversaciones para la organización
 */
const getConversationStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organization;
        const { dateFrom, dateTo } = req.query;
        // Filtros de fecha
        const dateFilter = {};
        if (dateFrom) {
            dateFilter.createdAt = { $gte: new Date(dateFrom) };
        }
        if (dateTo) {
            if (dateFilter.createdAt) {
                dateFilter.createdAt.$lte = new Date(dateTo);
            }
            else {
                dateFilter.createdAt = { $lte: new Date(dateTo) };
            }
        }
        const baseQuery = Object.assign({ organization: organizationId }, dateFilter);
        // Estadísticas generales
        const totalConversations = yield ConversationModel_1.default.countDocuments(baseQuery);
        const resolvedConversations = yield ConversationModel_1.default.countDocuments(Object.assign(Object.assign({}, baseQuery), { isResolved: true }));
        const unassignedConversations = yield ConversationModel_1.default.countDocuments(Object.assign(Object.assign({}, baseQuery), { assignedTo: null }));
        // Promedio de tiempo de resolución (para conversaciones resueltas)
        const avgResolutionTime = yield ConversationModel_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, baseQuery), { isResolved: true, firstContactTimestamp: { $exists: true }, updatedAt: { $exists: true } }),
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
        const pipelineStats = yield ConversationPipelineModel_1.default.aggregate([
            {
                $match: { organization: new mongoose_1.Types.ObjectId(organizationId) },
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
                            $match: Object.assign({ $expr: {
                                    $and: [
                                        { $eq: ["$pipeline", "$$pipelineId"] },
                                        {
                                            $eq: [
                                                "$organization",
                                                new mongoose_1.Types.ObjectId(organizationId),
                                            ],
                                        },
                                    ],
                                } }, dateFilter),
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
        const priorityStats = yield ConversationModel_1.default.aggregate([
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
        const assigneeStats = yield ConversationModel_1.default.aggregate([
            {
                $match: Object.assign(Object.assign({}, baseQuery), { assignedTo: { $ne: null } }),
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
            const stageData = pipeline.stages.map((stage) => {
                const stageStats = pipeline.stageStats.find((s) => s._id === stage.order);
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
                totalConversations: stageData.reduce((sum, stage) => sum + stage.count, 0),
            };
        });
        return res.status(200).json({
            success: true,
            data: {
                totalConversations,
                resolvedConversations,
                unassignedConversations,
                resolutionTime: avgResolutionTime.length > 0 ? avgResolutionTime[0].avgTime : 0,
                pipelineStats: formattedPipelineStats,
                priorityStats: priorityStats.reduce((result, stat) => {
                    result[stat._id] = stat.count;
                    return result;
                }, {}),
                assigneeStats,
            },
        });
    }
    catch (error) {
        console.error("Error al obtener estadísticas de conversaciones:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener estadísticas de conversaciones",
            error: error.message,
        });
    }
});
exports.getConversationStats = getConversationStats;
