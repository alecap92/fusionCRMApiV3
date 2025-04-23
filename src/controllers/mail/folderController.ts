import { Request, Response } from "express";
import imaps from "imap-simple";
import UserModel from "../../models/UserModel";
// import { IFolders } from "../../types";

/**
 * Lista las carpetas disponibles para el usuario.
 */
export const getFolders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      return res
        .status(404)
        .json({ error: "IMAP settings not found for user." });
    }

    const connection = await imaps.connect({
      imap: user.emailSettings.imapSettings,
    });
    const boxes = await connection.getBoxes();

    const folders = Object.keys(boxes); // Extraer nombres de carpetas
    res.status(200).json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ error: "Failed to fetch folders." });
  }
};

/**
 * Crea una nueva carpeta personalizada para el usuario.
 */
export const createFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { folderName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      return res
        .status(404)
        .json({ error: "IMAP settings not found for user." });
    }

    const connection = await imaps.connect({
      imap: user.emailSettings.imapSettings,
    });
    await connection.addBox(folderName);

    res
      .status(201)
      .json({ message: `Folder '${folderName}' created successfully.` });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder." });
  }
};

/**
 * Renombra una carpeta existente.
 */
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { oldName, newName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!oldName || !newName) {
      return res
        .status(400)
        .json({ error: "Both oldName and newName are required." });
    }

    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      return res
        .status(404)
        .json({ error: "IMAP settings not found for user." });
    }

    const connection = await imaps.connect({
      imap: user.emailSettings.imapSettings,
    });
    // await connection.renameBox(oldName, newName);

    res.status(200).json({
      message: `Folder '${oldName}' renamed to '${newName}' successfully.`,
    });
  } catch (error) {
    console.error("Error renaming folder:", error);
    res.status(500).json({ error: "Failed to rename folder." });
  }
};

/**
 * Elimina una carpeta existente.
 */
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { folderName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      return res
        .status(404)
        .json({ error: "IMAP settings not found for user." });
    }

    const connection = await imaps.connect({
      imap: user.emailSettings.imapSettings,
    });
    await connection.delBox(folderName);

    res
      .status(200)
      .json({ message: `Folder '${folderName}' deleted successfully.` });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Failed to delete folder." });
  }
};
