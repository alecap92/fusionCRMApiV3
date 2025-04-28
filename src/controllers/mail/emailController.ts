import { Request, Response } from "express";
import EmailModel from "../../models/EmailModel";
import UserModel from "../../models/UserModel";
import { sendEmailViaSMTP } from "../../utils/smtpClient";
import { deleteEmailFromServer } from "../../utils/imapClient";
import imaps from "imap-simple";

/**
 * Lista los correos electrónicos de un usuario.
 */
export const fetchEmails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { offset = 0, limit = 10, folder = "inbox" } = req.query;

    const emails = await EmailModel.find({ userId })
      .populate("contactId")
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ date: -1 });

    res.status(200).json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
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

    console.log(id, updates);

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

    console.log("Request received for downloading attachment:", {
      userId,
      emailId,
      partID,
    });

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

    console.log("Email found:", { emailId, uid: email.uid });

    // Buscar el adjunto en el correo
    const attachment = email.attachments?.find((att) => att.partID === partID);

    if (!attachment) {
      console.error("Attachment not found in email:", { emailId, partID });
      return res.status(404).json({ error: "Attachment not found." });
    }

    console.log("Attachment metadata found:", attachment);

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

    console.log("IMAP settings found for user.");

    // Conectar al servidor IMAP
    const connection = await imaps.connect({
      imap: { ...user.emailSettings.imapSettings, authTimeout: 10000 },
    });

    console.log("IMAP connection established.");

    await connection.openBox("INBOX");
    console.log("INBOX opened successfully.");

    // Buscar el mensaje en el servidor IMAP
    const message = await connection.search([["UID", email.uid.toString()]], {
      bodies: [""],
      struct: true,
    });

    console.log("Message retrieved from IMAP server:", message);

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

    console.log("Resolved part for attachment:", part);
    // Descargar el adjunto
    const attachmentStream = await connection.getPartData(message[0], part);

    console.log("Attachment downloaded successfully.");

    // Finalizar la conexión
    await connection.end();
    console.log("IMAP connection closed.");

    // Enviar el adjunto al cliente
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.filename}"`
    );
    res.send(attachmentStream);
    console.log("Attachment sent to client.");
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
