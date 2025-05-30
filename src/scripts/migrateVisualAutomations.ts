import mongoose from "mongoose";
import dotenv from "dotenv";
import AutomationModel from "../models/AutomationModel";

dotenv.config();

const OLD_AUTOMATION_COLLECTION = "automations_old"; // Colección del sistema antiguo

async function migrateVisualAutomations() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_CONNECTION!);
    console.log("✅ Conectado a MongoDB");

    // Obtener la conexión directa para acceder a la colección antigua
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("No se pudo obtener la conexión a la base de datos");
    }
    const oldAutomationsCollection = db.collection(OLD_AUTOMATION_COLLECTION);

    // Buscar todas las automatizaciones antiguas
    const oldAutomations = await oldAutomationsCollection.find({}).toArray();
    console.log(
      `📊 Encontradas ${oldAutomations.length} automatizaciones para migrar`
    );

    let migratedCount = 0;
    let errorCount = 0;

    for (const oldAuto of oldAutomations) {
      try {
        // Detectar el tipo de trigger basado en los nodos
        let triggerType = "manual";
        let automationType = "workflow";

        if (oldAuto.nodes && oldAuto.nodes.length > 0) {
          const triggerNode = oldAuto.nodes.find(
            (n: any) => n.type === "trigger"
          );

          if (triggerNode) {
            // Detectar si es una automatización de WhatsApp
            if (
              triggerNode.module === "whatsapp" ||
              oldAuto.nodes.some(
                (n: any) =>
                  n.type === "send_whatsapp" || n.module === "whatsapp"
              )
            ) {
              automationType = "conversation";
            }

            // Determinar el tipo de trigger
            switch (triggerNode.module) {
              case "whatsapp":
                if (triggerNode.event === "conversation_started") {
                  triggerType = "conversation_started";
                } else if (triggerNode.event === "keyword") {
                  triggerType = "keyword";
                } else {
                  triggerType = "message_received";
                }
                break;
              case "webhook":
                triggerType = "webhook";
                break;
              case "deal":
              case "deals":
                triggerType = "deal";
                break;
              case "contact":
              case "contacts":
                triggerType = "contact";
                break;
              case "task":
              case "tasks":
                triggerType = "task";
                break;
              default:
                triggerType = "manual";
            }
          }
        }

        // Crear la nueva automatización
        const newAutomation = {
          name: oldAuto.name || "Automatización migrada",
          description: oldAuto.description || "",
          organizationId: oldAuto.organizationId,
          isActive: oldAuto.status === "active" || oldAuto.isActive || false,
          nodes: oldAuto.nodes || [],
          edges: oldAuto.edges || [],
          triggerType,
          automationType,
          status: oldAuto.status || "inactive",
          createdBy: oldAuto.createdBy || oldAuto.userId,
          updatedBy: oldAuto.updatedBy,
          createdAt: oldAuto.createdAt || new Date(),
          updatedAt: oldAuto.updatedAt || new Date(),
          stats: {
            totalExecutions: oldAuto.runsCount || 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            lastExecutedAt: oldAuto.lastRun,
          },
        };

        // Verificar si ya existe una automatización con el mismo ID
        const existingAutomation = await AutomationModel.findById(oldAuto._id);

        if (existingAutomation) {
          console.log(
            `⚠️  Automatización ${oldAuto.name} ya existe, actualizando...`
          );
          await AutomationModel.findByIdAndUpdate(oldAuto._id, newAutomation);
        } else {
          // Crear con el mismo ID para mantener referencias
          await AutomationModel.create({
            _id: oldAuto._id,
            ...newAutomation,
          });
        }

        migratedCount++;
        console.log(`✅ Migrada: ${oldAuto.name} (${automationType})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrando ${oldAuto.name}:`, error);
      }
    }

    console.log("\n📊 Resumen de migración:");
    console.log(`✅ Migradas exitosamente: ${migratedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📝 Total procesadas: ${oldAutomations.length}`);

    // Verificar las automatizaciones migradas
    const totalAutomations = await AutomationModel.countDocuments();
    const conversationAutomations = await AutomationModel.countDocuments({
      automationType: "conversation",
    });
    const workflowAutomations = await AutomationModel.countDocuments({
      automationType: "workflow",
    });

    console.log("\n📈 Estado actual de automatizaciones:");
    console.log(`📝 Total: ${totalAutomations}`);
    console.log(`💬 Conversación (WhatsApp): ${conversationAutomations}`);
    console.log(`🔧 Workflow (Visual): ${workflowAutomations}`);
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Desconectado de MongoDB");
  }
}

// Ejecutar la migración
migrateVisualAutomations();
