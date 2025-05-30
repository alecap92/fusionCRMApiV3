import mongoose from "mongoose";
import dotenv from "dotenv";
import ConversationModel from "../models/ConversationModel";
import UserModel from "../models/UserModel";
import { AutomationService } from "../services/conversations/automationService";
import { AutomationHelper } from "../utils/automationHelper";

dotenv.config();

const testAutomations = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_CONNECTION as string);
    console.log("✅ Conectado a MongoDB");

    // Buscar una conversación de prueba
    const conversation = await ConversationModel.findOne({}).limit(1);

    if (!conversation) {
      console.log("❌ No se encontraron conversaciones para probar");
      return;
    }

    const conversationId = (conversation._id as any).toString();
    console.log(
      `🧪 Probando automatizaciones con conversación: ${conversationId}`
    );

    // 1. Verificar estado inicial
    console.log("\n1️⃣ Verificando estado inicial...");
    const initialStatus =
      await AutomationService.areAutomationsActive(conversationId);
    console.log(`Estado inicial: ${initialStatus ? "ACTIVO" : "PAUSADO"}`);

    // 2. Verificar si puede ejecutar saludo
    console.log("\n2️⃣ Verificando si puede ejecutar saludo...");
    const canGreet = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "greeting",
    });
    console.log(`¿Puede saludar?: ${canGreet ? "SÍ" : "NO"}`);

    // 3. Simular envío de saludo
    if (canGreet) {
      console.log("\n3️⃣ Simulando envío de saludo...");

      const mockSendMessage = async (phone: string, message: string) => {
        console.log(`📱 [SIMULADO] Enviando a ${phone}: "${message}"`);
        return Promise.resolve();
      };

      const greetingSent = await AutomationHelper.sendGreetingIfAllowed(
        conversationId,
        "+1234567890",
        mockSendMessage
      );

      console.log(`Saludo enviado: ${greetingSent ? "✅ SÍ" : "❌ NO"}`);
    }

    // 4. Verificar historial
    console.log("\n4️⃣ Verificando historial...");
    const history =
      await AutomationService.getAutomationHistory(conversationId);
    console.log(`Automatizaciones en historial: ${history.length}`);
    history.forEach((item, index) => {
      console.log(
        `  ${index + 1}. ${item.automationType} - ${item.triggeredAt}`
      );
    });

    // 5. Probar pausa de automatizaciones
    console.log("\n5️⃣ Probando pausa de automatizaciones...");
    await AutomationService.pauseAutomations({
      conversationId,
      duration: "30m",
      userId: "test-user",
    });

    const statusAfterPause =
      await AutomationService.areAutomationsActive(conversationId);
    console.log(
      `Estado después de pausar: ${statusAfterPause ? "ACTIVO" : "PAUSADO"}`
    );

    // 6. Verificar que no puede ejecutar mientras está pausado
    console.log("\n6️⃣ Verificando bloqueo durante pausa...");
    const canGreetWhilePaused = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "greeting",
    });
    console.log(
      `¿Puede saludar mientras está pausado?: ${canGreetWhilePaused ? "SÍ" : "NO"}`
    );

    // 7. Reanudar automatizaciones
    console.log("\n7️⃣ Reanudando automatizaciones...");
    await AutomationService.resumeAutomations(conversationId, "test-user");

    const statusAfterResume =
      await AutomationService.areAutomationsActive(conversationId);
    console.log(
      `Estado después de reanudar: ${statusAfterResume ? "ACTIVO" : "PAUSADO"}`
    );

    // 8. Verificar que ya no puede saludar (porque ya se ejecutó)
    console.log("\n8️⃣ Verificando prevención de duplicados...");
    const canGreetAgain = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "greeting",
    });
    console.log(
      `¿Puede saludar de nuevo?: ${canGreetAgain ? "SÍ" : "NO"} (debería ser NO)`
    );

    console.log("\n🎉 ¡Pruebas completadas exitosamente!");
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  }
};

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  testAutomations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default testAutomations;
