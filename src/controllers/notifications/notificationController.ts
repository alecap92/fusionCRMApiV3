import { Request, Response } from "express";
import IncomingMessageModel from "../../models/IncomingMessageModel";
import { getSocketInstance } from "../../config/socket";
import { FormResponseModel } from "../../models/FormResponse";
import UserModel from "../../models/UserModel";
import { Expo } from "expo-server-sdk";
import { sendNotification } from "../chat/services/pushNotificationService";

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

// Enviar un push de prueba al usuario autenticado
export const sendTestPush = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { title, body, data } = req.body || {};
    const user = await UserModel.findById(userId, {
      pushToken: 1,
      firstName: 1,
      lastName: 1,
    });
    const tokens: string[] = (user?.pushToken || []).filter(Boolean);
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));

    if (validTokens.length === 0) {
      return res
        .status(400)
        .json({ message: "Usuario sin push tokens válidos" });
    }

    await sendNotification(validTokens, {
      title: title || "Test Push",
      body: body || "Hola desde backend",
      data: data || { kind: "backend_test", ts: new Date().toISOString() },
    });

    return res.status(200).json({ success: true, sentTo: validTokens.length });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Error enviando push", error: error.message });
  }
};
