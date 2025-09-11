import mongoose from "mongoose";
import N8nModel from "../models/n8nModel";
import N8nAutomationModel from "../models/N8nAutomation";

// Configuración de conexión a MongoDB
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fusioncol";

async function migrateN8nData() {
  try {
    console.log("🚀 Iniciando migración de datos N8N...");

    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    // Obtener todas las automatizaciones del modelo antiguo
    const oldAutomations = await N8nModel.find({});
    console.log(
      `📊 Encontradas ${oldAutomations.length} automatizaciones para migrar`
    );

    if (oldAutomations.length === 0) {
      console.log("ℹ️ No hay automatizaciones para migrar");
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const oldAutomation of oldAutomations) {
      try {
        console.log(`🔄 Migrando automatización: ${oldAutomation.name}`);

        // Crear nueva automatización con el modelo actualizado
        const newAutomation = new N8nAutomationModel({
          name: oldAutomation.name,
          description: `Migrada desde modelo anterior - ${oldAutomation.name}`,
          category: "custom", // Categoría por defecto
          webhooks: [
            {
              name: "Webhook Principal",
              endpoint: oldAutomation.endpoint,
              method: oldAutomation.method || "POST",
              headers: {},
              bodyTemplate: "",
              authentication: {
                type: oldAutomation.apiKey ? "api_key" : "none",
                credentials: oldAutomation.apiKey
                  ? { apiKey: oldAutomation.apiKey }
                  : undefined,
              },
              isActive: true,
              timeout: 30000,
              retryCount: 0,
            },
          ],
          forms: [], // Sin formularios por defecto
          triggers: [
            {
              type: "custom",
              conditions: [],
              isActive: true,
              priority: 1,
            },
          ],
          isActive: true,
          organizationId: oldAutomation.organizationId,
          createdBy: oldAutomation.userId,
          tags: ["migrated", "legacy"],
          executionStats: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
          },
          executionConfig: {
            maxConcurrentExecutions: 1,
            retryOnFailure: false,
            maxRetries: 3,
            executionTimeout: 60000,
            pauseOnError: false,
          },
        });

        await newAutomation.save();
        migratedCount++;

        console.log(
          `✅ Automatización migrada exitosamente: ${oldAutomation.name}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error migrando automatización ${oldAutomation.name}:`,
          error.message
        );
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN DE MIGRACIÓN");
    console.log("=".repeat(50));
    console.log(`✅ Automatizaciones migradas: ${migratedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📝 Total procesadas: ${oldAutomations.length}`);

    if (errorCount === 0) {
      console.log("\n🎉 ¡Migración completada exitosamente!");

      // Opcional: Eliminar datos antiguos después de migración exitosa
      const shouldDeleteOld = process.argv.includes("--delete-old");
      if (shouldDeleteOld) {
        console.log("\n🗑️ Eliminando datos antiguos...");
        await N8nModel.deleteMany({});
        console.log("✅ Datos antiguos eliminados");
      } else {
        console.log(
          "\n💡 Para eliminar datos antiguos, ejecuta con --delete-old"
        );
      }
    } else {
      console.log(
        "\n⚠️ La migración se completó con errores. Revisa los logs."
      );
    }
  } catch (error) {
    console.error("💥 Error durante la migración:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  }
}

// Función para verificar la migración
async function verifyMigration() {
  try {
    console.log("🔍 Verificando migración...");

    await mongoose.connect(MONGODB_URI);

    const oldCount = await N8nModel.countDocuments();
    const newCount = await N8nAutomationModel.countDocuments();

    console.log(`📊 Modelo antiguo: ${oldCount} automatizaciones`);
    console.log(`📊 Modelo nuevo: ${newCount} automatizaciones`);

    if (newCount >= oldCount) {
      console.log("✅ Migración verificada exitosamente");
    } else {
      console.log("❌ La migración no se completó correctamente");
    }
  } catch (error) {
    console.error("💥 Error verificando migración:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Función para revertir la migración (solo para desarrollo)
async function revertMigration() {
  try {
    console.log("🔄 Revirtiendo migración...");

    await mongoose.connect(MONGODB_URI);

    await N8nAutomationModel.deleteMany({ tags: { $in: ["migrated"] } });

    console.log("✅ Migración revertida");
  } catch (error) {
    console.error("💥 Error revirtiendo migración:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Función principal
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "migrate":
      await migrateN8nData();
      break;
    case "verify":
      await verifyMigration();
      break;
    case "revert":
      await revertMigration();
      break;
    default:
      console.log("📋 Comandos disponibles:");
      console.log(
        "  npm run ts-node src/scripts/migrateN8nData.ts migrate    # Migrar datos"
      );
      console.log(
        "  npm run ts-node src/scripts/migrateN8nData.ts verify    # Verificar migración"
      );
      console.log(
        "  npm run ts-node src/scripts/migrateN8nData.ts revert    # Revertir migración"
      );
      console.log("\n💡 Para migrar y eliminar datos antiguos:");
      console.log(
        "  npm run ts-node src/scripts/migrateN8nData.ts migrate --delete-old"
      );
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(console.error);
}

export { migrateN8nData, verifyMigration, revertMigration };
