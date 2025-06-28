// src/tests/webhook-test.ts
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import AutomationModel from "../models/AutomationModel";

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();
app.use(bodyParser.json());

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

// Ruta para simular un webhook entrante
app.post("/webhook/:module/:event", async (req, res) => {
  const { module, event } = req.params;
  const payload = req.body;
  const organizationId = req.headers["x-organization-id"] as string;

  console.log(`Webhook recibido: ${module}/${event}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    // Buscar automatizaciones que coincidan con este evento
    const automations = await AutomationModel.find({
      isActive: true,
      nodes: {
        $elemMatch: {
          type: "trigger",
          module,
          event,
        },
      },
    });

    console.log(
      `Encontradas ${automations.length} automatizaciones que coinciden`
    );

    // Ejecutar cada automatización que coincida
    const executionPromises = automations.map((automation) => {
      // Verificar si hay condiciones de payloadMatch
      const triggerNode = automation.nodes.find(
        (node) =>
          node.type === "trigger" &&
          node.module === module &&
          node.event === event
      );

      if (triggerNode?.payloadMatch) {
        // Verificar si el payload coincide con las condiciones
        const matches = Object.entries(triggerNode.payloadMatch).every(
          ([key, value]) => {
            const payloadValue = key
              .split(".")
              .reduce((obj, prop) => obj && obj[prop], payload);
            return payloadValue === value;
          }
        );

        if (!matches) {
          console.log(
            `Automatización ${automation._id} no coincide con payloadMatch`
          );
          return null;
        }
      }

      console.log(`Ejecutando automatización ${automation._id}`);
      return true;
    });

    const executionResults = await Promise.all(
      executionPromises.filter(
        (p) => p !== null
      ) as unknown as Promise<boolean>[]
    );

    res.status(200).json({
      message: "Webhook procesado correctamente",
      automationsTriggered: executionResults.length,
      executionIds: executionResults,
    });
  } catch (error) {
    console.error("Error al procesar webhook:", error);
    res.status(500).json({
      message: "Error al procesar webhook",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Iniciar el servidor
const PORT = 3002; // Puerto diferente al de tu aplicación principal
const server = app.listen(PORT, () => {
  console.log(`Servidor de prueba de webhooks iniciado en puerto ${PORT}`);
  console.log(
    `Envía un POST a http://localhost:${PORT}/webhook/deals/created para probar`
  );
});

// Función para crear una automatización de prueba para el webhook
async function setupWebhookTest() {
  try {
    // Crear una organización de prueba
    const organizationId = new mongoose.Types.ObjectId();

    // Crear una automatización que responda a deals/created
    const automation = new AutomationModel({
      name: "Notificación de Nuevo Trato",
      description: "Envía un email cuando se crea un nuevo trato",
      isActive: true,
      organizationId,
      createdBy: new mongoose.Types.ObjectId(),
      nodes: [
        {
          id: "1",
          type: "trigger",
          module: "deals",
          event: "created",
          next: ["2"],
          payloadMatch: {
            "deal.value": 1000,
          },
        },
        {
          id: "2",
          type: "send_email",
          to: "ventas@ejemplo.com",
          subject: "Nuevo trato creado - {{deal.name}}",
          emailBody:
            "<p>Se ha creado un nuevo trato por valor de {{deal.value}}.</p>",
        },
      ],
    });

    await automation.save();
    console.log(`Automatización creada con ID: ${automation._id}`);
    console.log("\nPuedes probar enviando:");
    console.log(
      `curl -X POST http://localhost:${PORT}/webhook/deals/created \\`
    );
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "x-organization-id: ${organizationId}" \\`);
    console.log(`  -d '{"deal":{"name":"Nuevo Cliente","value":1000}}'`);

    // Mantener el servidor ejecutándose
    console.log("\nPresiona Ctrl+C para terminar la prueba");
  } catch (error) {
    console.error("Error al configurar prueba de webhook:", error);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Iniciar la configuración de la prueba
setupWebhookTest();

// Manejar cierre limpio
process.on("SIGINT", async () => {
  console.log("\nCerrando servidor y conexiones...");
  server.close();
  await mongoose.disconnect();
  process.exit(0);
});
