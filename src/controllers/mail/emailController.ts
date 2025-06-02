import { Request, Response } from "express";
import EmailModel from "../../models/EmailModel";
import UserModel from "../../models/UserModel";
import { sendEmailViaSMTP } from "../../utils/smtpClient";
import { deleteEmailFromServer } from "../../utils/imapClient";
import imaps from "imap-simple";
import { emitToUser } from "../../config/socket";

/**
 * Lista los correos electrónicos de un usuario.
 */
export const fetchEmails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extraer parámetros de query
    const {
      page = 1,
      limit = 50,
      folder = "INBOX",
      isRead,
      isStarred,
      hasAttachments,
      priority,
      labels,
    } = req.query;

    // Construir filtros
    const filters: any = { userId };

    // Mapear carpetas del frontend al backend
    const folderMapping: { [key: string]: string } = {
      INBOX: "INBOX",
      SENT: "SENT",
      STARRED: "INBOX", // Los destacados son emails con isStarred=true
      ARCHIVE: "ARCHIVE",
      TRASH: "TRASH",
      DRAFTS: "DRAFTS",
      SPAM: "SPAM",
    };

    // Aplicar filtro de carpeta
    if (folder && folder !== "STARRED") {
      const mappedFolder = folderMapping[folder as string] || folder;
      filters.folder = mappedFolder;
    }

    // Filtros adicionales
    if (isRead !== undefined) {
      filters.isRead = isRead === "true";
    }

    if (isStarred !== undefined || folder === "STARRED") {
      filters.isStarred = true;
    }

    if (hasAttachments !== undefined) {
      filters.hasAttachments = hasAttachments === "true";
    }

    if (priority) {
      filters.priority = priority;
    }

    if (labels) {
      const labelArray =
        typeof labels === "string" ? labels.split(",") : labels;
      filters.labels = { $in: labelArray };
    }

    // Calcular offset
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Obtener total primero
    const total = await EmailModel.countDocuments(filters);

    // Obtener emails con filtros
    const emails = await EmailModel.find(filters)
      .populate("contactId")
      .skip(offset)
      .limit(limitNum)
      .sort({ date: -1 });

    // Estructura de respuesta que espera el frontend
    const response = {
      emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: offset + limitNum < total,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error fetching emails:", error);
    res.status(500).json({ error: "Failed to fetch emails." });
  }
};

/**
 * Obtiene los detalles de un correo específico.
 */
export const fetchEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const email = await EmailModel.findOne({ _id: id, userId }).populate(
      "contactId"
    );

    if (!email) {
      return res.status(404).json({ error: "Email not found." });
    }

    res.status(200).json(email);
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({ error: "Failed to fetch email." });
  }
};

/**
 * Envía un correo electrónico a través de SMTP.
 */
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.smtpSettings) {
      return res
        .status(400)
        .json({ error: "SMTP settings not found for user." });
    }

    // Leer y parsear los campos del form-data
    let to: string[] = [];
    if (typeof req.body.to === "string") {
      try {
        to = JSON.parse(req.body.to);
      } catch {
        to = [req.body.to];
      }
    } else if (Array.isArray(req.body.to)) {
      to = req.body.to;
    }

    const subject = req.body.subject?.toString();
    const content = req.body.content;

    if (!to.length || !subject || !content) {
      return res.status(400).json({
        error: "Recipient (to), subject, and content are required.",
      });
    }

    // Procesar adjuntos desde req.files (Multer)
    let attachments: { filename: string; content: Buffer }[] = [];
    if (req.files && Array.isArray(req.files)) {
      attachments = req.files.map((file: Express.Multer.File) => ({
        filename: file.originalname,
        content: file.buffer,
      }));
    } else if (req.files && typeof req.files === "object") {
      // Si usas upload.fields([{ name: 'attachments' }])
      const filesArray = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )["attachments"];
      if (Array.isArray(filesArray)) {
        attachments = filesArray.map((file) => ({
          filename: file.originalname,
          content: file.buffer,
        }));
      }
    }

    const result = await sendEmailViaSMTP(user.emailSettings.smtpSettings, {
      to: to.join(","), // nodemailer espera string separado por comas
      subject,
      html: content,
      attachments,
    });

    res.status(200).json({
      message: "Email sent successfully.",
      result,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
};

/**
 * Guarda nuevos correos electrónicos en la base de datos.
 */
export const saveNewEmails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const newEmails = req.body.emails;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(newEmails) || newEmails.length === 0) {
      return res.status(400).json({ error: "No emails provided." });
    }

    // Guardar solo los correos que no existen en la base de datos
    const savedEmails = await Promise.all(
      newEmails.map(async (email) => {
        const existingEmail = await EmailModel.findOne({
          userId,
          uid: email.uid,
        });
        if (!existingEmail) {
          return EmailModel.create({ ...email, userId });
        }
        return null;
      })
    );

    res.status(200).json({
      message: "Emails processed and saved successfully.",
      savedEmails: savedEmails.filter((email) => email !== null),
    });
  } catch (error) {
    console.error("Error saving new emails:", error);
    res.status(500).json({ error: "Failed to save emails." });
  }
};

/**
 * Elimina un correo electrónico desde la base de datos y opcionalmente del servidor IMAP.
 */
export const deleteEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Buscar el correo en la base de datos
    const email = await EmailModel.findOne({ _id: id, userId });

    if (!email) {
      return res.status(404).json({ error: "Email not found." });
    }

    // Opcional: Eliminar el correo del servidor IMAP
    const imapResult = await deleteEmailFromServer(userId, email.uid);

    // Eliminar el correo de la base de datos
    await EmailModel.findByIdAndDelete(id);

    res.status(200).json({
      message: "Email deleted successfully.",
      imapResult,
    });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({ error: "Failed to delete email." });
  }
};

/**
 * Actualiza un correo (por ejemplo, marcar como leído/no leído).
 */
export const updateEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const email = await EmailModel.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ error: "Email not found." });
    }

    res.status(200).json({ message: "Email updated successfully.", email });
  } catch (error) {
    console.error("Error updating email:", error);
    res.status(500).json({ error: "Failed to update email." });
  }
};

/**
 * Descarga un adjunto específico.
 */
export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { emailId, partID } = req.params;

    if (!userId) {
      console.error("Unauthorized access attempt.");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Buscar el correo en la base de datos
    const email = await EmailModel.findOne({ _id: emailId, userId });

    if (!email) {
      console.error("Email not found:", { emailId });
      return res.status(404).json({ error: "Email not found." });
    }

    // Buscar el adjunto en el correo
    const attachment = email.attachments?.find((att) => att.partID === partID);

    if (!attachment) {
      console.error("Attachment not found in email:", { emailId, partID });
      return res.status(404).json({ error: "Attachment not found." });
    }

    // Obtener las configuraciones IMAP del usuario
    const user = await UserModel.findOne({ _id: userId }).select(
      "emailSettings"
    );

    if (!user?.emailSettings?.imapSettings) {
      console.error("IMAP settings not found for user:", { userId });
      return res
        .status(400)
        .json({ error: "IMAP settings not found for user." });
    }

    // Conectar al servidor IMAP
    const connection = await imaps.connect({
      imap: { ...user.emailSettings.imapSettings, authTimeout: 10000 },
    });

    await connection.openBox("INBOX");

    // Buscar el mensaje en el servidor IMAP
    const message = await connection.search([["UID", email.uid.toString()]], {
      bodies: [""],
      struct: true,
    });

    if (!message.length) {
      console.error("No message found for UID:", email.uid);
      await connection.end();
      return res
        .status(404)
        .json({ error: "Message not found on IMAP server." });
    }

    // Obtener la estructura del mensaje
    const part = message[0]?.attributes?.struct
      ? message[0].attributes.struct
          .flat(10)
          .find(
            (p: any) =>
              p.partID === attachment.partID ||
              p.id?.includes(attachment.partID) ||
              (p.disposition?.params?.filename === attachment.filename &&
                p.type === "application")
          )
      : undefined;

    if (!part) {
      console.error(
        "Attachment part not found in message structure or message structure is undefined.",
        { partID, attachment }
      );
      await connection.end();
      return res.status(404).json({ error: "Attachment part not found." });
    }

    // Descargar el adjunto
    const attachmentStream = await connection.getPartData(message[0], part);

    // Finalizar la conexión
    await connection.end();

    // Enviar el adjunto al cliente
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.filename}"`
    );
    res.send(attachmentStream);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    res.status(500).json({ error: "Failed to download attachment." });
  }
};

export const fetchEmailByContactId = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { contactId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const emails = await EmailModel.find({ userId, contactId });

    res.status(200).json(emails);
  } catch (error) {
    console.error("Error fetching emails by contact ID:", error);
    res.status(500).json({ error: "Failed to fetch emails." });
  }
};
