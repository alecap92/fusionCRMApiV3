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
// src/tests/webhook-sender.ts
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const readline_1 = __importDefault(require("readline"));
// Cargar variables de entorno
dotenv_1.default.config();
// Crear interfaz de readline para interacción por consola
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
// Función para enviar un webhook de prueba
function sendTestWebhook() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Generar ID de organización aleatorio para pruebas
            const organizationId = new mongoose_1.default.Types.ObjectId().toString();
            // Preguntar por el módulo
            const module = yield promptUser("Ingresa el módulo (ej: deals): ");
            // Preguntar por el evento
            const event = yield promptUser("Ingresa el evento (ej: created): ");
            // Preguntar por el payload (JSON)
            const payloadStr = yield promptUser("Ingresa el payload JSON (o deja vacío para usar un ejemplo): ");
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
                console.log("Usando payload de ejemplo:", JSON.stringify(payload, null, 2));
            }
            else {
                try {
                    payload = JSON.parse(payloadStr);
                }
                catch (err) {
                    console.error("Error al parsear JSON. Usando formato de ejemplo.");
                    payload = { data: payloadStr };
                }
            }
            // URL del webhook
            const webhookUrl = `http://localhost:${process.env.PORT || 3001}/api/v1/webhooks/${module}/${event}`;
            console.log(`\nEnviando webhook a: ${webhookUrl}`);
            console.log(`OrganizationId: ${organizationId}`);
            // Enviar la solicitud
            const response = yield axios_1.default.post(webhookUrl, payload, {
                headers: {
                    "Content-Type": "application/json",
                    "x-organization-id": organizationId,
                },
            });
            console.log("\nRespuesta del servidor:");
            console.log("Status:", response.status);
            console.log("Datos:", JSON.stringify(response.data, null, 2));
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error("\nError al enviar webhook:");
                console.error("Status:", (_a = error.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error("Mensaje:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
            }
            else {
                console.error("\nError:", error);
            }
        }
        finally {
            rl.close();
        }
    });
}
// Función auxiliar para prompts
function promptUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}
// Ejecutar el script
sendTestWebhook();
