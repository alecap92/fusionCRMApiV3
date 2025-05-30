import mongoose from "mongoose";
import dotenv from "dotenv";
import ConversationModel from "../models/ConversationModel";
import UserModel from "../models/UserModel";
import { AutomationService } from "../services/conversations/automationService";

dotenv.config();

const testAutomationsSimple = async () => {
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

    // Buscar un usuario válido para usar como pausedBy
    const user = await UserModel.findOne({}).limit(1);
    const testUserId = user
      ? user._id.toString()
      : new mongoose.Types.ObjectId().toString();

    const conversationId = (conversation._id as any).toString();
    console.log(
      `🧪 Probando automatizaciones con conversación: ${conversationId}`
    );
    console.log(`👤 Usando usuario de prueba: ${testUserId}`);

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

    // 3. Reanudar automatizaciones si están pausadas
    if (!initialStatus) {
      console.log("\n3️⃣ Reanudando automatizaciones...");
      await AutomationService.resumeAutomations(conversationId, testUserId);

      const statusAfterResume =
        await AutomationService.areAutomationsActive(conversationId);
      console.log(
        `Estado después de reanudar: ${statusAfterResume ? "ACTIVO" : "PAUSADO"}`
      );
    }

    // 4. Verificar si puede ejecutar saludo después de reanudar
    console.log(
      "\n4️⃣ Verificando si puede ejecutar saludo después de reanudar..."
    );
    const canGreetAfterResume = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "greeting",
    });
    console.log(
      `¿Puede saludar después de reanudar?: ${canGreetAfterResume ? "SÍ" : "NO"}`
    );

    // 5. Simular ejecución de saludo
    if (canGreetAfterResume) {
      console.log("\n5️⃣ Simulando ejecución de saludo...");
      await AutomationService.recordAutomationTriggered(
        conversationId,
        "greeting",
        testUserId
      );
      console.log("✅ Saludo registrado en el historial");
    }

    // 6. Verificar que ya no puede ejecutar el mismo saludo
    console.log("\n6️⃣ Verificando prevención de duplicados...");
    const canGreetAgain = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "greeting",
    });
    console.log(
      `¿Puede saludar de nuevo?: ${canGreetAgain ? "SÍ" : "NO"} (debería ser NO)`
    );

    // 7. Probar pausa temporal
    console.log("\n7️⃣ Probando pausa temporal (30 minutos)...");
    await AutomationService.pauseAutomations({
      conversationId,
      duration: "30m",
      userId: testUserId,
    });

    const statusAfterPause =
      await AutomationService.areAutomationsActive(conversationId);
    console.log(
      `Estado después de pausar: ${statusAfterPause ? "ACTIVO" : "PAUSADO"}`
    );

    // 8. Verificar que no puede ejecutar mientras está pausado
    console.log("\n8️⃣ Verificando bloqueo durante pausa...");
    const canExecuteWhilePaused = await AutomationService.canTriggerAutomation({
      conversationId,
      automationType: "followup",
    });
    console.log(
      `¿Puede ejecutar seguimiento mientras está pausado?: ${canExecuteWhilePaused ? "SÍ" : "NO"}`
    );

    console.log("\n🎉 ¡Pruebas básicas completadas exitosamente!");
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  }
};

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  testAutomationsSimple()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default testAutomationsSimple;
