// src/tests/webhook-sender.ts
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import readline from "readline";

// Cargar variables de entorno
dotenv.config();

// Crear interfaz de readline para interacción por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Función para enviar un webhook de prueba
async function sendTestWebhook() {
  try {
    // Generar ID de organización aleatorio para pruebas
    const organizationId = new mongoose.Types.ObjectId().toString();

    // Preguntar por el módulo
    const module = await promptUser("Ingresa el módulo (ej: deals): ");

    // Preguntar por el evento
    const event = await promptUser("Ingresa el evento (ej: created): ");

    // Preguntar por el payload (JSON)
    const payloadStr = await promptUser(
      "Ingresa el payload JSON (o deja vacío para usar un ejemplo): "
    );

    // Usar payload personalizado o un ejemplo predefinido
    let payload;
    if (payloadStr.trim() === "") {
      payload = {
        deal: {
          _id: "DEAL" + Math.floor(Math.random() * 10000),
          name: "Venta de ejemplo",
          value: Math.floor(Math.random() * 10000),
          status: "completed",
          previousStatus: "pending",
        },
        timestamp: new Date().toISOString(),
      };
      console.log(
        "Usando payload de ejemplo:",
        JSON.stringify(payload, null, 2)
      );
    } else {
      try {
        payload = JSON.parse(payloadStr);
      } catch (err) {
        console.error("Error al parsear JSON. Usando formato de ejemplo.");
        payload = { data: payloadStr };
      }
    }

    // URL del webhook
    const webhookUrl = `http://localhost:${process.env.PORT || 3001}/api/v1/webhooks/${module}/${event}`;

    console.log(`\nEnviando webhook a: ${webhookUrl}`);
    console.log(`OrganizationId: ${organizationId}`);

    // Enviar la solicitud
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
    });

    console.log("\nRespuesta del servidor:");
    console.log("Status:", response.status);
    console.log("Datos:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("\nError al enviar webhook:");
      console.error("Status:", error.response?.status);
      console.error("Mensaje:", error.response?.data || error.message);
    } else {
      console.error("\nError:", error);
    }
  } finally {
    rl.close();
  }
}

// Función auxiliar para prompts
function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Ejecutar el script
sendTestWebhook();
