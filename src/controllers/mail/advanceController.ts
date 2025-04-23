import { Request, Response } from "express";
import EmailModel from "../../models/EmailModel";

/**
 * Realiza operaciones masivas en correos electrónicos.
 */
export const bulkEmailOperations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { emailIds, action } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res
        .status(400)
        .json({ error: "No email IDs provided for bulk operation." });
    }

    if (
      !["markAsRead", "markAsUnread", "delete", "moveToFolder"].includes(action)
    ) {
      return res.status(400).json({ error: "Invalid action specified." });
    }

    let updateResult;
    switch (action) {
      case "markAsRead":
        updateResult = await EmailModel.updateMany(
          { _id: { $in: emailIds }, userId },
          { $set: { isRead: true } }
        );
        break;
      case "markAsUnread":
        updateResult = await EmailModel.updateMany(
          { _id: { $in: emailIds }, userId },
          { $set: { isRead: false } }
        );
        break;
      case "delete":
        updateResult = await EmailModel.deleteMany({
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
        updateResult = await EmailModel.updateMany(
          { _id: { $in: emailIds }, userId },
          { $set: { folder } }
        );
        break;
    }

    res.status(200).json({
      message: `Bulk operation '${action}' completed successfully.`,
      result: updateResult,
    });
  } catch (error) {
    console.error("Error performing bulk operation:", error);
    res.status(500).json({ error: "Failed to perform bulk operation." });
  }
};

/**
 * Obtiene estadísticas relacionadas con los correos electrónicos.
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const totalEmails = await EmailModel.countDocuments({ userId });
    const unreadEmails = await EmailModel.countDocuments({
      userId,
      isRead: false,
    });
    const usedStorage = await EmailModel.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } },
    ]);

    res.status(200).json({
      totalEmails,
      unreadEmails,
      usedStorage: usedStorage[0]?.totalSize || 0,
    });
  } catch (error) {
    console.error("Error fetching email stats:", error);
    res.status(500).json({ error: "Failed to fetch email stats." });
  }
};

/**
 * Configura notificaciones push para eventos de correos.
 */
export const pushNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
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
    console.log(
      `Push notifications ${enable ? "enabled" : "disabled"} for user ${userId}.`
    );

    res.status(200).json({
      message: `Push notifications ${enable ? "enabled" : "disabled"} successfully.`,
    });
  } catch (error) {
    console.error("Error configuring push notifications:", error);
    res.status(500).json({ error: "Failed to configure push notifications." });
  }
};
