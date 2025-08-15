import mongoose from "mongoose";
import Conversation from "../models/ConversationModel";
import Message from "../models/MessageModel";

async function fixUnreadCount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fusioncrm");
    console.log("Conectado a MongoDB");

    // Obtener todas las conversaciones
    const conversations = await Conversation.find({});
    console.log(`Encontradas ${conversations.length} conversaciones`);

    let fixedCount = 0;

    for (const conversation of conversations) {
      // Obtener el último mensaje de la conversación
      const lastMessage = await Message.findOne({
        conversation: conversation._id
      }).sort({ timestamp: -1 });

      if (lastMessage) {
        let shouldUpdate = false;
        let newUnreadCount = conversation.unreadCount || 0;

        // Si el último mensaje es saliente, el unreadCount debería ser 0
        if (lastMessage.direction === "outgoing" && conversation.unreadCount > 0) {
          newUnreadCount = 0;
          shouldUpdate = true;
        }
        // Si el último mensaje es entrante, verificar si hay mensajes no leídos
        else if (lastMessage.direction === "incoming") {
          const unreadIncomingMessages = await Message.countDocuments({
            conversation: conversation._id,
            direction: "incoming",
            isRead: false
          });
          
          if (unreadIncomingMessages !== conversation.unreadCount) {
            newUnreadCount = unreadIncomingMessages;
            shouldUpdate = true;
          }
        }

        if (shouldUpdate) {
          await Conversation.findByIdAndUpdate(conversation._id, {
            unreadCount: newUnreadCount
          });
          console.log(`Conversación ${conversation._id}: unreadCount actualizado de ${conversation.unreadCount} a ${newUnreadCount}`);
          fixedCount++;
        }
      }
    }

    console.log(`✅ Script completado. ${fixedCount} conversaciones corregidas.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar el script
fixUnreadCount();
