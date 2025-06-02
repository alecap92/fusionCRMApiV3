import mongoose from "mongoose";
import EmailModel from "../models/EmailModel";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

async function migrateEmails() {
  try {
    // Usar la misma configuración que el servidor principal
    const mongoUri = process.env.MONGODB_CONNECTION;

    if (!mongoUri) {
      console.error(
        "❌ MONGODB_CONNECTION no está definida en las variables de entorno"
      );
      process.exit(1);
    }

    // Conectar a MongoDB
    await mongoose.connect(mongoUri);
    console.log("✅ Conectado a MongoDB");

    // Buscar emails que necesitan migración (sin los campos nuevos)
    const emailsToMigrate = await EmailModel.find({
      $or: [
        { folder: { $exists: false } },
        { isRead: { $exists: false } },
        { isStarred: { $exists: false } },
        { isImportant: { $exists: false } },
        { labels: { $exists: false } },
        { priority: { $exists: false } },
        { flags: { $exists: false } },
        { hasAttachments: { $exists: false } },
        { isEncrypted: { $exists: false } },
        { messageId: { $exists: false } },
      ],
    });

    console.log(`📧 Encontrados ${emailsToMigrate.length} emails para migrar`);

    if (emailsToMigrate.length === 0) {
      console.log("✅ No hay emails que migrar");
      return;
    }

    // Migrar cada email
    let migratedCount = 0;
    for (const email of emailsToMigrate) {
      try {
        // Generar snippet del contenido
        const content = email.text || email.html || "";
        const snippet = content
          .replace(/<[^>]*>/g, "") // Remover HTML tags
          .replace(/\s+/g, " ") // Normalizar espacios
          .trim()
          .substring(0, 200);

        // Detectar si tiene adjuntos
        const hasAttachments =
          email.attachments && email.attachments.length > 0;

        // Generar messageId si no existe
        const messageId =
          email.messageId || `${email.uid}-${email.userId}-${Date.now()}`;

        // Actualizar el email con los campos faltantes
        await EmailModel.findByIdAndUpdate(email._id, {
          $set: {
            folder: email.folder || "INBOX",
            isRead: email.isRead !== undefined ? email.isRead : false,
            isStarred: email.isStarred !== undefined ? email.isStarred : false,
            isImportant:
              email.isImportant !== undefined ? email.isImportant : false,
            labels: email.labels || [],
            priority: email.priority || "normal",
            flags: email.flags || [],
            hasAttachments: hasAttachments,
            isEncrypted:
              email.isEncrypted !== undefined ? email.isEncrypted : false,
            snippet: snippet,
            messageId: messageId,
            size: email.size || content.length || 0,
            spamScore: email.spamScore || 0,
          },
        });

        migratedCount++;

        if (migratedCount % 100 === 0) {
          console.log(
            `📈 Migrados ${migratedCount}/${emailsToMigrate.length} emails`
          );
        }
      } catch (error) {
        console.error(`❌ Error migrando email ${email._id}:`, error);
      }
    }

    console.log(
      `✅ Migración completada: ${migratedCount} emails actualizados`
    );

    // Verificar la migración
    const remainingEmails = await EmailModel.find({
      $or: [
        { folder: { $exists: false } },
        { isRead: { $exists: false } },
        { messageId: { $exists: false } },
      ],
    });

    if (remainingEmails.length === 0) {
      console.log("✅ Todos los emails han sido migrados correctamente");
    } else {
      console.log(`⚠️  Quedan ${remainingEmails.length} emails sin migrar`);
    }
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateEmails()
    .then(() => {
      console.log("🎉 Migración finalizada");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Error fatal:", error);
      process.exit(1);
    });
}

export default migrateEmails;
