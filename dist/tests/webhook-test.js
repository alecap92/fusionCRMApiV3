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
// src/tests/webhook-test.ts
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
// Cargar variables de entorno
dotenv_1.default.config();
// Crear la aplicación Express
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
// Conectar a la base de datos
const mongoUri = process.env.MONGODB_CONNECTION;
if (!mongoUri) {
    console.error("Error: MONGODB_CONNECTION no está definido en las variables de entorno");
    process.exit(1);
}
mongoose_1.default
    .connect(mongoUri)
    .then(() => console.log("MongoDB conectado"))
    .catch((err) => console.error("Error de MongoDB:", err));
// Ruta para simular un webhook entrante
app.post("/webhook/:module/:event", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { module, event } = req.params;
    const payload = req.body;
    const organizationId = req.headers["x-organization-id"];
    console.log(`Webhook recibido: ${module}/${event}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    try {
        // Buscar automatizaciones que coincidan con este evento
        const automations = yield AutomationModel_1.default.find({
            isActive: true,
            nodes: {
                $elemMatch: {
                    type: "trigger",
                    module,
                    event,
                },
            },
        });
        console.log(`Encontradas ${automations.length} automatizaciones que coinciden`);
        // Ejecutar cada automatización que coincida
        const executionPromises = automations.map((automation) => {
            // Verificar si hay condiciones de payloadMatch
            const triggerNode = automation.nodes.find((node) => node.type === "trigger" &&
                node.module === module &&
                node.event === event);
            if (triggerNode === null || triggerNode === void 0 ? void 0 : triggerNode.payloadMatch) {
                // Verificar si el payload coincide con las condiciones
                const matches = Object.entries(triggerNode.payloadMatch).every(([key, value]) => {
                    const payloadValue = key
                        .split(".")
                        .reduce((obj, prop) => obj && obj[prop], payload);
                    return payloadValue === value;
                });
                if (!matches) {
                    console.log(`Automatización ${automation._id} no coincide con payloadMatch`);
                    return null;
                }
            }
            console.log(`Ejecutando automatización ${automation._id}`);
            return true;
        });
        const executionResults = yield Promise.all(executionPromises.filter((p) => p !== null));
        res.status(200).json({
            message: "Webhook procesado correctamente",
            automationsTriggered: executionResults.length,
            executionIds: executionResults,
        });
    }
    catch (error) {
        console.error("Error al procesar webhook:", error);
        res.status(500).json({
            message: "Error al procesar webhook",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}));
// Iniciar el servidor
const PORT = 3002; // Puerto diferente al de tu aplicación principal
const server = app.listen(PORT, () => {
    console.log(`Servidor de prueba de webhooks iniciado en puerto ${PORT}`);
    console.log(`Envía un POST a http://localhost:${PORT}/webhook/deals/created para probar`);
});
// Función para crear una automatización de prueba para el webhook
function setupWebhookTest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Crear una organización de prueba
            const organizationId = new mongoose_1.default.Types.ObjectId();
            // Crear una automatización que responda a deals/created
            const automation = new AutomationModel_1.default({
                name: "Notificación de Nuevo Trato",
                description: "Envía un email cuando se crea un nuevo trato",
                isActive: true,
                organizationId,
                createdBy: new mongoose_1.default.Types.ObjectId(),
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
                        emailBody: "<p>Se ha creado un nuevo trato por valor de {{deal.value}}.</p>",
                    },
                ],
            });
            yield automation.save();
            console.log(`Automatización creada con ID: ${automation._id}`);
            console.log("\nPuedes probar enviando:");
            console.log(`curl -X POST http://localhost:${PORT}/webhook/deals/created \\`);
            console.log(`  -H "Content-Type: application/json" \\`);
            console.log(`  -H "x-organization-id: ${organizationId}" \\`);
            console.log(`  -d '{"deal":{"name":"Nuevo Cliente","value":1000}}'`);
            // Mantener el servidor ejecutándose
            console.log("\nPresiona Ctrl+C para terminar la prueba");
        }
        catch (error) {
            console.error("Error al configurar prueba de webhook:", error);
            server.close();
            yield mongoose_1.default.disconnect();
            process.exit(1);
        }
    });
}
// Iniciar la configuración de la prueba
setupWebhookTest();
// Manejar cierre limpio
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("\nCerrando servidor y conexiones...");
    server.close();
    yield mongoose_1.default.disconnect();
    process.exit(0);
}));
