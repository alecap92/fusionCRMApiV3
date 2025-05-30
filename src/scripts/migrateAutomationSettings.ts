import mongoose from "mongoose";
import dotenv from "dotenv";
import ConversationModel from "../models/ConversationModel";

dotenv.config();

const migrateAutomationSettings = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_CONNECTION as string);
    console.log("Conectado a MongoDB");

    // Buscar todas las conversaciones que no tienen automationSettings
    const conversationsWithoutSettings = await ConversationModel.find({
      automationSettings: { $exists: false },
    });

    console.log(
      `Encontradas ${conversationsWithoutSettings.length} conversaciones sin automationSettings`
    );

    if (conversationsWithoutSettings.length === 0) {
      console.log("Todas las conversaciones ya tienen automationSettings");
      return;
    }

    // Actualizar conversaciones en lotes
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < conversationsWithoutSettings.length; i += batchSize) {
      const batch = conversationsWithoutSettings.slice(i, i + batchSize);
      const batchIds = batch.map((conv) => conv._id);

      await ConversationModel.updateMany(
        { _id: { $in: batchIds } },
        {
          $set: {
            automationSettings: {
              isPaused: false,
              automationHistory: [],
            },
          },
        }
      );

      updated += batch.length;
      console.log(
        `Actualizadas ${updated}/${conversationsWithoutSettings.length} conversaciones`
      );
    }

    console.log("✅ Migración completada exitosamente");
    console.log(`Total de conversaciones actualizadas: ${updated}`);
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Desconectado de MongoDB");
  }
};

// Ejecutar la migración si el script se ejecuta directamente
if (require.main === module) {
  migrateAutomationSettings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateAutomationSettings;
