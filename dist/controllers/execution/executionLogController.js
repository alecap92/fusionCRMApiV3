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
exports.getExecutionError = exports.getExecutionStats = exports.getExecutionDetail = exports.getExecutionLogs = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ExecutionLogModel_1 = __importDefault(require("../../models/ExecutionLogModel"));
/**
 * Obtener logs de ejecución con filtros
 */
const getExecutionLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { automationId, status, startDate, endDate, page = 1, limit = 10, } = req.query;
        const queryOptions = {
            organizationId: new mongoose_1.default.Types.ObjectId((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId),
        };
        // Aplicar filtros si existen
        if (automationId) {
            queryOptions.automationId = new mongoose_1.default.Types.ObjectId(automationId);
        }
        if (status && status !== "all") {
            queryOptions.status = status;
        }
        // Filtros de fecha
        if (startDate || endDate) {
            queryOptions.startTime = {};
            if (startDate) {
                queryOptions.startTime.$gte = new Date(startDate);
            }
            if (endDate) {
                queryOptions.startTime.$lte = new Date(endDate);
            }
        }
        // Calcular paginación
        const skip = (Number(page) - 1) * Number(limit);
        // Obtener total de documentos
        const total = yield ExecutionLogModel_1.default.countDocuments(queryOptions);
        // Obtener logs paginados
        const logs = yield ExecutionLogModel_1.default.find(queryOptions)
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
    }
    catch (error) {
        console.error("Error al obtener logs de ejecución:", error);
        return res.status(500).json({
            message: "Error al obtener logs de ejecución",
            error: error.message,
        });
    }
});
exports.getExecutionLogs = getExecutionLogs;
/**
 * Obtener detalle de una ejecución específica
 */
const getExecutionDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const log = yield ExecutionLogModel_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(id),
            organizationId: new mongoose_1.default.Types.ObjectId((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId),
        }).lean();
        if (!log) {
            return res
                .status(404)
                .json({ message: "Log de ejecución no encontrado" });
        }
        return res.status(200).json({ data: log });
    }
    catch (error) {
        console.error("Error al obtener detalle de ejecución:", error);
        return res.status(500).json({
            message: "Error al obtener detalle de ejecución",
            error: error.message,
        });
    }
});
exports.getExecutionDetail = getExecutionDetail;
/**
 * Obtener estadísticas de ejecuciones
 */
const getExecutionStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { automationId, startDate, endDate } = req.query;
        const matchStage = {
            organizationId: new mongoose_1.default.Types.ObjectId((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId),
        };
        // Aplicar filtros si existen
        if (automationId) {
            matchStage.automationId = new mongoose_1.default.Types.ObjectId(automationId);
        }
        // Filtros de fecha
        if (startDate || endDate) {
            matchStage.startTime = {};
            if (startDate) {
                matchStage.startTime.$gte = new Date(startDate);
            }
            if (endDate) {
                matchStage.startTime.$lte = new Date(endDate);
            }
        }
        else {
            // Por defecto, estadísticas de los últimos 30 días
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchStage.startTime = { $gte: thirtyDaysAgo };
        }
        // Pipeline para estadísticas
        const [stats] = yield ExecutionLogModel_1.default.aggregate([
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
        const byDay = yield ExecutionLogModel_1.default.aggregate([
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
            data: Object.assign(Object.assign({}, (stats || {
                total: 0,
                success: 0,
                failed: 0,
                inProgress: 0,
                averageDuration: 0,
            })), { byDay }),
        });
    }
    catch (error) {
        console.error("Error al obtener estadísticas de ejecución:", error);
        return res.status(500).json({
            message: "Error al obtener estadísticas de ejecución",
            error: error.message,
        });
    }
});
exports.getExecutionStats = getExecutionStats;
/**
 * Obtener detalles de error de una ejecución
 */
const getExecutionError = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const log = yield ExecutionLogModel_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(id),
            organizationId: new mongoose_1.default.Types.ObjectId((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId),
            status: "failed",
        }, {
            error: 1,
            nodesExecution: 1,
        }).lean();
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
    }
    catch (error) {
        console.error("Error al obtener detalles de error:", error);
        return res.status(500).json({
            message: "Error al obtener detalles de error",
            error: error.message,
        });
    }
});
exports.getExecutionError = getExecutionError;
