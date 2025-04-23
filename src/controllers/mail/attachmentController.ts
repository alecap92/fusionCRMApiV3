import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import EmailModel from "../../models/EmailModel";

/**
 * Descarga un archivo adjunto asociado a un correo.
 */
export const getAttachment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { emailId, attachmentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Buscar el correo con el ID dado
    const email = await EmailModel.findOne({ _id: emailId, userId });

    if (!email) {
      return res.status(404).json({ error: "Email not found." });
    }

    // Buscar el archivo adjunto específico
    const attachment = email?.attachments?.find(
      (att: any) => att.id === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    // Ruta al archivo guardado en el servidor
    const filePath = path.resolve(
      __dirname,
      "../../uploads/",
      attachment.filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on the server." });
    }

    // Enviar el archivo como respuesta
    res.download(filePath, attachment.filename);
  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).json({ error: "Failed to fetch attachment." });
  }
};

/**
 * Sube un archivo adjunto para un correo saliente.
 */
export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { originalname, mimetype, size } = req.file;

    res.status(200).json({
      message: "File uploaded successfully.",
      file: {
        originalName: originalname,

        mimeType: mimetype,
        size,
      },
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: "Failed to upload attachment." });
  }
};
