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
exports.pushNotifications = exports.getStats = exports.bulkEmailOperations = void 0;
const EmailModel_1 = __importDefault(require("../../models/EmailModel"));
/**
 * Realiza operaciones masivas en correos electrónicos.
 */
const bulkEmailOperations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { emailIds, action } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return res
                .status(400)
                .json({ error: "No email IDs provided for bulk operation." });
        }
        if (!["markAsRead", "markAsUnread", "delete", "moveToFolder"].includes(action)) {
            return res.status(400).json({ error: "Invalid action specified." });
        }
        let updateResult;
        switch (action) {
            case "markAsRead":
                updateResult = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { isRead: true } });
                break;
            case "markAsUnread":
                updateResult = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { isRead: false } });
                break;
            case "delete":
                updateResult = yield EmailModel_1.default.deleteMany({
                    _id: { $in: emailIds },
                    userId,
                });
                break;
            case "moveToFolder":
                const { folder } = req.body;
                if (!folder) {
                    return res
                        .status(400)
                        .json({ error: "Folder name is required for move operation." });
                }
                updateResult = yield EmailModel_1.default.updateMany({ _id: { $in: emailIds }, userId }, { $set: { folder } });
                break;
        }
        res.status(200).json({
            message: `Bulk operation '${action}' completed successfully.`,
            result: updateResult,
        });
    }
    catch (error) {
        console.error("Error performing bulk operation:", error);
        res.status(500).json({ error: "Failed to perform bulk operation." });
    }
});
exports.bulkEmailOperations = bulkEmailOperations;
/**
 * Obtiene estadísticas relacionadas con los correos electrónicos.
 */
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const totalEmails = yield EmailModel_1.default.countDocuments({ userId });
        const unreadEmails = yield EmailModel_1.default.countDocuments({
            userId,
            isRead: false,
        });
        const usedStorage = yield EmailModel_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } },
        ]);
        res.status(200).json({
            totalEmails,
            unreadEmails,
            usedStorage: ((_b = usedStorage[0]) === null || _b === void 0 ? void 0 : _b.totalSize) || 0,
        });
    }
    catch (error) {
        console.error("Error fetching email stats:", error);
        res.status(500).json({ error: "Failed to fetch email stats." });
    }
});
exports.getStats = getStats;
/**
 * Configura notificaciones push para eventos de correos.
 */
const pushNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { enable } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (typeof enable !== "boolean") {
            return res
                .status(400)
                .json({ error: "Invalid value for 'enable'. It must be a boolean." });
        }
        // Simular la configuración de notificaciones push
        console.log(`Push notifications ${enable ? "enabled" : "disabled"} for user ${userId}.`);
        res.status(200).json({
            message: `Push notifications ${enable ? "enabled" : "disabled"} successfully.`,
        });
    }
    catch (error) {
        console.error("Error configuring push notifications:", error);
        res.status(500).json({ error: "Failed to configure push notifications." });
    }
});
exports.pushNotifications = pushNotifications;
