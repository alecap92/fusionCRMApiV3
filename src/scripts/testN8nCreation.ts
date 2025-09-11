import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api/v1";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTk0YTc0OTgzZGU1OGNhNTU0N2I5NDUiLCJlbWFpbCI6ImFsZWphbmRyby5jYWJyZWpvQGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IkFsZWphbmRybyIsImxhc3ROYW1lIjoiQ2FicmVqbyIsIm1vYmlsZSI6IjMxNDMwMDcyNjMiLCJvcmdhbml6YXRpb25JZCI6IjY1OWQ4OWI3M2M2YWE4NjVmMWU3ZDZmYiIsInJlbWVtYmVyTWUiOmZhbHNlLCJyb2xlIjoiIiwiaWF0IjoxNzU2NDgzMDQxLCJleHAiOjE3NTY1Njk0NDF9.zv3_ovXyxeZrqhSO2CqRSyhDPvMI8LT239joQ0aF0Bo";

const automationData = {
  name: "Create Contact",
  endpoint: "https://automata.alecap922.site/webhook-test/create-contact",
  apiKey: "optional-api-key-here", // Opcional
};

async function createN8nAutomation() {
  try {
    console.log("🚀 Creando automatización n8n...");
    console.log("📋 Datos:", automationData);

    const response = await axios.post(`${API_BASE_URL}/n8n`, automationData, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Automatización creada exitosamente!");
    console.log("📊 Respuesta:", response.data);

    return response.data;
  } catch (error: any) {
    console.error("❌ Error al crear automatización:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
}

async function getN8nAutomations() {
  try {
    console.log("🔍 Obteniendo automatizaciones n8n...");

    const response = await axios.get(`${API_BASE_URL}/n8n`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Automatizaciones obtenidas exitosamente!");
    console.log("📊 Respuesta:", response.data);

    return response.data;
  } catch (error: any) {
    console.error("❌ Error al obtener automatizaciones:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
}

// Función principal
async function main() {
  try {
    console.log("🎯 Iniciando prueba de N8N...\n");

    // Primero obtener las automatizaciones existentes
    await getN8nAutomations();
    console.log("\n" + "=".repeat(50) + "\n");

    // Crear nueva automatización
    await createN8nAutomation();
    console.log("\n" + "=".repeat(50) + "\n");

    // Obtener automatizaciones después de crear
    await getN8nAutomations();

    console.log("\n🎉 Prueba completada exitosamente!");
  } catch (error) {
    console.error("\n💥 Prueba falló:", error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

export { createN8nAutomation, getN8nAutomations };
