import { Request, Response } from "express";
import IncomingMessageModel from "../../models/IncomingMessageModel";
import { getSocketInstance } from "../../config/socket";
import { FormResponseModel } from "../../models/FormResponse";

// Obtener las notificaciones iniciales para una organización
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    // Obtener conteo de mensajes de WhatsApp no leídos
    const unreadWhatsapp = await IncomingMessageModel.countDocuments({
      organization: organizationId,
      isRead: false,
    });

    // Obtener conteo de formularios no leídos
    const unreadForms = await FormResponseModel.countDocuments({
      organizationId,
      isRead: false,
    });

    // Retornar los conteos de notificaciones
    return res.status(200).json({
      unreadWhatsapp,
      unreadForms,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "An error occurred while fetching notifications",
      error: error.message,
    });
  }
};

// Emitir una nueva notificación cuando llega un mensaje nuevo o un formulario
export const emitNewNotification = (
  type: "whatsapp" | "form",
  organizationId: any,
  count: number = 1,
  contact: string, // Incluye el contacto para identificar el chat
  message: { message: string; timestamp: Date } // Detalles del mensaje
) => {
  const io = getSocketInstance();

  let notificationTitle = "";

  switch (type) {
    case "whatsapp":
      notificationTitle = "Nuevo mensaje de WhatsApp:" + " " + message.message;
      break;
    case "form":
      notificationTitle = "Nuevo formulario recibido:" + " " + message.message;
      break;
  }
  console.log(notificationTitle);

  // Emitir notificación a la sala específica de la organización
  io.to(`organization_${organizationId}`).emit("newNotification", {
    title: notificationTitle,
    type,
    contact, // Incluir el contacto para que el frontend pueda identificarlo
    message, // Incluir el mensaje completo
  });


};

// Controlador para manejar la llegada de un nuevo mensaje de WhatsApp

// Resetear el contador de notificaciones no leídas
export const resetNotifications = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user!;

    // Marcar todos los mensajes de WhatsApp como leídos
    await IncomingMessageModel.updateMany(
      { organization: organizationId, isRead: false },
      { isRead: true }
    );

    // Marcar todos los formularios como leídos
    await FormResponseModel.updateMany(
      { organizationId, isRead: false },
      { isRead: true }
    );

    // Emitir evento para resetear las notificaciones
    const io = getSocketInstance();
    io.to(`organization_${organizationId}`).emit("newNotification", {
      unreadForm: 0,
      unreadWhatsapp: 0,
    });

    return res
      .status(200)
      .json({ message: "Contador de notificaciones restablecido" });
  } catch (error: any) {
    return res.status(500).json({
      message: "An error occurred while resetting notifications",
      error: error.message,
    });
  }
};
