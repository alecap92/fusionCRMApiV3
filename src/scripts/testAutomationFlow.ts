import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WEBHOOK_URL = "http://localhost:3001/webhook/whatsapp";
const PHONE_NUMBER = "15551234567"; // Número de WhatsApp de la integración

interface TestScenario {
  name: string;
  messages: Array<{
    text: string;
    waitSeconds?: number;
  }>;
  from: string;
  contactName: string;
}

const scenarios: TestScenario[] = [
  {
    name: "Flujo completo del chatbot",
    from: "34612345678",
    contactName: "Carlos Test",
    messages: [
      { text: "Hola", waitSeconds: 2 },
      { text: "1", waitSeconds: 2 }, // Información de productos
      { text: "sí", waitSeconds: 2 }, // Más información
      { text: "Gracias", waitSeconds: 1 },
    ],
  },
  {
    name: "Solicitar agente",
    from: "34687654321",
    contactName: "María Test",
    messages: [
      { text: "Buenos días", waitSeconds: 2 },
      { text: "4", waitSeconds: 2 }, // Hablar con agente
    ],
  },
  {
    name: "Palabras clave de precio",
    from: "34655555555",
    contactName: "Pedro Test",
    messages: [
      { text: "¿Cuál es el precio de sus servicios?", waitSeconds: 2 },
      { text: "¿Cuánto cuesta el plan profesional?", waitSeconds: 2 },
    ],
  },
];

async function sendMessage(
  from: string,
  text: string,
  contactName: string,
  messageId?: string
) {
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: PHONE_NUMBER,
              },
              messages: [
                {
                  from: from,
                  id:
                    messageId ||
                    `test_msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                  timestamp: timestamp.toString(),
                  text: {
                    body: text,
                  },
                  type: "text",
                },
              ],
              contacts: [
                {
                  wa_id: from,
                  profile: {
                    name: contactName,
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Mensaje enviado: "${text}" de ${contactName}`);
    return response.data;
  } catch (error: any) {
    console.error(
      `❌ Error enviando mensaje:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function sleep(seconds: number) {
  console.log(`⏳ Esperando ${seconds} segundos...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function runScenario(scenario: TestScenario) {
  console.log(`\n🎭 Ejecutando escenario: ${scenario.name}`);
  console.log(`👤 Cliente: ${scenario.contactName} (${scenario.from})`);
  console.log("━".repeat(50));

  for (const message of scenario.messages) {
    await sendMessage(scenario.from, message.text, scenario.contactName);

    if (message.waitSeconds) {
      await sleep(message.waitSeconds);
    }
  }

  console.log(`✅ Escenario completado: ${scenario.name}\n`);
}

async function runAllTests() {
  console.log("🚀 Iniciando pruebas de automatizaciones");
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`📱 WhatsApp Number: ${PHONE_NUMBER}`);
  console.log("═".repeat(50));

  try {
    // Verificar que el webhook esté activo
    console.log("\n🔍 Verificando conexión al webhook...");
    try {
      await axios.get("http://localhost:3001/health");
      console.log("✅ Webhook activo y funcionando");
    } catch (error) {
      console.error(
        "❌ El webhook no está respondiendo. Asegúrate de que el servidor esté corriendo."
      );
      return;
    }

    // Ejecutar cada escenario
    for (const scenario of scenarios) {
      await runScenario(scenario);
      await sleep(3); // Esperar entre escenarios
    }

    console.log("\n🎉 ¡Todas las pruebas completadas!");
    console.log("\n📝 Próximos pasos:");
    console.log(
      "1. Revisa los logs del servidor para ver las automatizaciones ejecutándose"
    );
    console.log(
      "2. Verifica en la base de datos que se crearon las conversaciones"
    );
    console.log(
      "3. Comprueba que los mensajes automatizados se enviaron correctamente"
    );
  } catch (error) {
    console.error("\n❌ Error durante las pruebas:", error);
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { sendMessage, runScenario };
