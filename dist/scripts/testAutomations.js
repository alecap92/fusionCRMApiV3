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
const automationService_1 = require("../services/conversations/automationService");
const automationHelper_1 = require("../utils/automationHelper");
dotenv_1.default.config();
const testAutomations = () => __awaiter(void 0, void 0, void 0, function* () {
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
        const conversationId = conversation._id.toString();
        console.log(`🧪 Probando automatizaciones con conversación: ${conversationId}`);
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
        // 3. Simular envío de saludo
        if (canGreet) {
            console.log("\n3️⃣ Simulando envío de saludo...");
            const mockSendMessage = (phone, message) => __awaiter(void 0, void 0, void 0, function* () {
                console.log(`📱 [SIMULADO] Enviando a ${phone}: "${message}"`);
                return Promise.resolve();
            });
            const greetingSent = yield automationHelper_1.AutomationHelper.sendGreetingIfAllowed(conversationId, "+1234567890", mockSendMessage);
            console.log(`Saludo enviado: ${greetingSent ? "✅ SÍ" : "❌ NO"}`);
        }
        // 4. Verificar historial
        console.log("\n4️⃣ Verificando historial...");
        const history = yield automationService_1.AutomationService.getAutomationHistory(conversationId);
        console.log(`Automatizaciones en historial: ${history.length}`);
        history.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.automationType} - ${item.triggeredAt}`);
        });
        // 5. Probar pausa de automatizaciones
        console.log("\n5️⃣ Probando pausa de automatizaciones...");
        yield automationService_1.AutomationService.pauseAutomations({
            conversationId,
            duration: "30m",
            userId: "test-user",
        });
        const statusAfterPause = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
        console.log(`Estado después de pausar: ${statusAfterPause ? "ACTIVO" : "PAUSADO"}`);
        // 6. Verificar que no puede ejecutar mientras está pausado
        console.log("\n6️⃣ Verificando bloqueo durante pausa...");
        const canGreetWhilePaused = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "greeting",
        });
        console.log(`¿Puede saludar mientras está pausado?: ${canGreetWhilePaused ? "SÍ" : "NO"}`);
        // 7. Reanudar automatizaciones
        console.log("\n7️⃣ Reanudando automatizaciones...");
        yield automationService_1.AutomationService.resumeAutomations(conversationId, "test-user");
        const statusAfterResume = yield automationService_1.AutomationService.areAutomationsActive(conversationId);
        console.log(`Estado después de reanudar: ${statusAfterResume ? "ACTIVO" : "PAUSADO"}`);
        // 8. Verificar que ya no puede saludar (porque ya se ejecutó)
        console.log("\n8️⃣ Verificando prevención de duplicados...");
        const canGreetAgain = yield automationService_1.AutomationService.canTriggerAutomation({
            conversationId,
            automationType: "greeting",
        });
        console.log(`¿Puede saludar de nuevo?: ${canGreetAgain ? "SÍ" : "NO"} (debería ser NO)`);
        console.log("\n🎉 ¡Pruebas completadas exitosamente!");
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
    testAutomations()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = testAutomations;
