// tests/automation-test.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import AutomationModel from "../models/AutomationModel";
import { automationExecutionService } from "../services/automation/automationExecutionService";
import ExecutionLogModel from "../models/ExecutionLogModel";

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
const mongoUri = process.env.MONGODB_CONNECTION;
if (!mongoUri) {
  console.error(
    "Error: MONGODB_CONNECTION no está definido en las variables de entorno"
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.error("Error de MongoDB:", err));

// Función para crear una automatización de prueba
async function createTestAutomation() {
  try {
    // Crear una automatización de ejemplo (sin eliminar las existentes)
    const automation = new AutomationModel({
      name: "Automatización de prueba",
      description: "Automatización para probar el sistema",
      isActive: true,
      organizationId: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      nodes: [
        {
          id: "1",
          type: "trigger",
          module: "deals",
          event: "status_changed",
          next: ["2"],
          payloadMatch: {
            fromStatus: "pending",
            toStatus: "completed",
          },
        },
        {
          id: "2",
          type: "condition",
          conditions: [
            {
              field: "deal.value",
              operator: "gt",
              value: 1000,
            },
          ],
          trueNext: ["3"],
          falseNext: ["4"],
        },
        {
          id: "3",
          type: "send_email",
          to: "cliente@ejemplo.com",
          subject: "¡Gracias por tu compra importante!",
          emailBody:
            "<p>Hola {{deal.client.name}}, gracias por tu compra de {{deal.value}}!</p>",
        },
        {
          id: "4",
          type: "send_email",
          to: "cliente@ejemplo.com",
          subject: "Gracias por tu compra",
          emailBody: "<p>Hola {{deal.client.name}}, gracias por tu compra!</p>",
        },
      ],
    });

    await automation.save();
    console.log("Automatización creada:", automation._id);
    return automation;
  } catch (error) {
    console.error("Error al crear automatización:", error);
    throw error;
  }
}

// Función para ejecutar la automatización de prueba
async function runTestAutomation(automation: any) {
  try {
    // Datos de prueba que simularían el evento que dispara la automatización
    const testData = {
      deal: {
        _id: "12345",
        value: 1500,
        client: {
          name: "Juan Pérez",
          email: "cliente@ejemplo.com",
        },
        status: "completed",
        previousStatus: "pending",
      },
    };

    console.log("Ejecutando automatización...");
    const executionId = await automationExecutionService.executeAutomation(
      automation,
      testData
    );

    console.log("Ejecución iniciada con ID:", executionId);

    // Esperar unos segundos para que la ejecución termine
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Obtener y mostrar los logs de ejecución
    const executionLog = await ExecutionLogModel.findOne({ executionId });
    console.log("\nResultados de la ejecución:");
    console.log("Estado:", executionLog?.status);
    console.log("Tiempo de ejecución:", executionLog?.executionTime, "ms");
    console.log("Logs de nodos:");
    executionLog?.logs?.forEach((log) => {
      console.log(
        `[${log.timestamp.toISOString()}] ${log.nodeId} - ${log.action}: ${log.message}`
      );
    });

    return executionLog;
  } catch (error) {
    console.error("Error al ejecutar automatización:", error);
    throw error;
  }
}

// Ejecutar la prueba completa
async function runFullTest() {
  try {
    console.log("Iniciando prueba completa...");
    const automation = await createTestAutomation();
    await runTestAutomation(automation);
    console.log("Prueba completada con éxito");

    // Cerrar la conexión
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error en la prueba:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Función para crear una automatización de emails masivos de ejemplo
async function createMassEmailAutomation() {
  try {
    // Crear una automatización de ejemplo de envío masivo
    const automation = new AutomationModel({
      name: "Automatización de emails masivos",
      description: "Envía emails a todos los contactos de una lista",
      isActive: true,
      organizationId: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      nodes: [
        {
          id: "1",
          type: "trigger",
          module: "manual", // Trigger manual, se ejecutará manualmente
          event: "execute",
          next: ["2"],
        },
        {
          id: "2", 
          type: "send_mass_email",
          listId: "ID_DE_TU_LISTA", // Aquí deberías colocar un ID real de una lista
          subject: "Información importante para nuestros clientes",
          emailBody: "<p>Hola {{contact.firstName}},</p><p>Te enviamos esta información importante...</p><p>Saludos,<br>El equipo</p>",
          next: ["3"]
        },
        {
          id: "3",
          type: "transform",
          transformations: [
            {
              outputField: "emailReport",
              expression: "Emails enviados: {{massEmailResult.successCount}} de {{massEmailResult.totalContacts}}"
            }
          ]
        }
      ],
    });

    await automation.save();
    console.log("Automatización de emails masivos creada:", automation._id);
    return automation;
  } catch (error) {
    console.error("Error al crear automatización de emails masivos:", error);
    throw error;
  }
}

// Ejecutar las pruebas
runFullTest();
