"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const ConversationModel_1 = __importDefault(require("../models/ConversationModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const automationService_1 = require("../services/conversations/automationService");
dotenv_1.default.config();
const testAutomationsSimple = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Conectar a MongoDB
        yield mongoose_1.default.connect(process.env.MONGODB_CONNECTION);
        console.log("✅ Conectado a MongoDB");
        // Buscar una conversación de prueba
        const conversation = yield ConversationModel_1.default.findOne({}).limit(1);
        if (!conversation) {
            console.log("❌ No se encontraron conversaciones para probar");
            return;
        }
        // Buscar un usuario válido para usar como pausedBy
        const user = yield UserModel_1.default.findOne({}).limit(1);
        const testUserId = user
            ? user._id.toString()
            : new mongoose_1.default.Types.ObjectId().toString();
        const conversationId = conversation._id.toString();
        console.log(`🧪 Probando automatizaciones con conversación: ${conversationId}`);
        console.log(`👤 Usando usuario de prueba: ${testUserId}`);
        // 1. Verificar estado inicial
        console.log("\n1️⃣ Verificando estado inicial...");
        const initialStatus = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
        console.log(`Estado inicial: ${initialStatus ? "ACTIVO" : "PAUSADO"}`);
        // 2. Verificar si puede ejecutar saludo
        console.log("\n2️⃣ Verificando si puede ejecutar saludo...");
        const canGreet = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "greeting",
        });
        console.log(`¿Puede saludar?: ${canGreet ? "SÍ" : "NO"}`);
        // 3. Reanudar automatizaciones si están pausadas
        if (!initialStatus) {
            console.log("\n3️⃣ Reanudando automatizaciones...");
            yield automationService_1.AutomationService.resumeAutomations(conversationId, testUserId);
            const statusAfterResume = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
            console.log(`Estado después de reanudar: ${statusAfterResume ? "ACTIVO" : "PAUSADO"}`);
        }
        // 4. Verificar si puede ejecutar saludo después de reanudar
        console.log("\n4️⃣ Verificando si puede ejecutar saludo después de reanudar...");
        const canGreetAfterResume = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "greeting",
        });
        console.log(`¿Puede saludar después de reanudar?: ${canGreetAfterResume ? "SÍ" : "NO"}`);
        // 5. Simular ejecución de saludo
        if (canGreetAfterResume) {
            console.log("\n5️⃣ Simulando ejecución de saludo...");
            yield automationService_1.AutomationService.recordAutomationTriggered(conversationId, "greeting", testUserId);
            console.log("✅ Saludo registrado en el historial");
        }
        // 6. Verificar que ya no puede ejecutar el mismo saludo
        console.log("\n6️⃣ Verificando prevención de duplicados...");
        const canGreetAgain = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "greeting",
        });
        console.log(`¿Puede saludar de nuevo?: ${canGreetAgain ? "SÍ" : "NO"} (debería ser NO)`);
        // 7. Probar pausa temporal
        console.log("\n7️⃣ Probando pausa temporal (30 minutos)...");
        yield automationService_1.AutomationService.pauseAutomations({
            conversationId,
            duration: "30m",
            userId: testUserId,
        });
        const statusAfterPause = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
        console.log(`Estado después de pausar: ${statusAfterPause ? "ACTIVO" : "PAUSADO"}`);
        // 8. Verificar que no puede ejecutar mientras está pausado
        console.log("\n8️⃣ Verificando bloqueo durante pausa...");
        const canExecuteWhilePaused = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "followup",
        });
        console.log(`¿Puede ejecutar seguimiento mientras está pausado?: ${canExecuteWhilePaused ? "SÍ" : "NO"}`);
        console.log("\n🎉 ¡Pruebas básicas completadas exitosamente!");
    }
    catch (error) {
        console.error("❌ Error durante las pruebas:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
        console.log("🔌 Desconectado de MongoDB");
    }
});
// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
    testAutomationsSimple()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = testAutomationsSimple;
