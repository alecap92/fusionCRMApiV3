import { Request, Response } from "express";
import { syncOldEmails } from "../../utils/imapClient";

/**
 * Controlador para sincronizar correos antiguos desde el servidor IMAP
 */
export const syncOldMails = async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ error: "User ID is required." });
  }

  try {
    console.log("syncOldMails");
    // Llama a la función utilitaria para sincronizar correos antiguos
    const syncedEmails = await syncOldEmails(userId);

    if (syncedEmails.length === 0) {
      return res.status(200).json({ message: "No old emails found." });
    }

    res.status(200).json({
      message: "Old emails fetched and saved to the database.",
      syncedEmails,
    });
  } catch (error) {
    console.error("Error syncing old emails:", error);
    res.status(500).json({ error: "Failed to sync old emails." });
  }
};
