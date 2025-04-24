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
// tests/automation-test.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
const automationExecutionService_1 = require("../services/automation/automationExecutionService");
const ExecutionLogModel_1 = __importDefault(require("../models/ExecutionLogModel"));
// Cargar variables de entorno
dotenv_1.default.config();
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
// Función para crear una automatización de prueba
function createTestAutomation() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Crear una automatización de ejemplo (sin eliminar las existentes)
            const automation = new AutomationModel_1.default({
                name: "Automatización de prueba",
                description: "Automatización para probar el sistema",
                isActive: true,
                organizationId: new mongoose_1.default.Types.ObjectId(),
                createdBy: new mongoose_1.default.Types.ObjectId(),
                nodes: [
                    {
                        id: "1",
                        type: "trigger",
                        module: "deals",
                        event: "status_changed",
                        next: ["2"],
                        payloadMatch: {
                            fromStatus: "pending",
                            toStatus: "completed",
                        },
                    },
                    {
                        id: "2",
                        type: "condition",
                        conditions: [
                            {
                                field: "deal.value",
                                operator: "gt",
                                value: 1000,
                            },
                        ],
                        trueNext: ["3"],
                        falseNext: ["4"],
                    },
                    {
                        id: "3",
                        type: "send_email",
                        to: "cliente@ejemplo.com",
                        subject: "¡Gracias por tu compra importante!",
                        emailBody: "<p>Hola {{deal.client.name}}, gracias por tu compra de {{deal.value}}!</p>",
                    },
                    {
                        id: "4",
                        type: "send_email",
                        to: "cliente@ejemplo.com",
                        subject: "Gracias por tu compra",
                        emailBody: "<p>Hola {{deal.client.name}}, gracias por tu compra!</p>",
                    },
                ],
            });
            yield automation.save();
            console.log("Automatización creada:", automation._id);
            return automation;
        }
        catch (error) {
            console.error("Error al crear automatización:", error);
            throw error;
        }
    });
}
// Función para ejecutar la automatización de prueba
function runTestAutomation(automation) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Datos de prueba que simularían el evento que dispara la automatización
            const testData = {
                deal: {
                    _id: "12345",
                    value: 1500,
                    client: {
                        name: "Juan Pérez",
                        email: "cliente@ejemplo.com",
                    },
                    status: "completed",
                    previousStatus: "pending",
                },
            };
            console.log("Ejecutando automatización...");
            const executionId = yield automationExecutionService_1.automationExecutionService.executeAutomation(automation, testData);
            console.log("Ejecución iniciada con ID:", executionId);
            // Esperar unos segundos para que la ejecución termine
            yield new Promise((resolve) => setTimeout(resolve, 5000));
            // Obtener y mostrar los logs de ejecución
            const executionLog = yield ExecutionLogModel_1.default.findOne({ executionId });
            console.log("\nResultados de la ejecución:");
            console.log("Estado:", executionLog === null || executionLog === void 0 ? void 0 : executionLog.status);
            console.log("Tiempo de ejecución:", executionLog === null || executionLog === void 0 ? void 0 : executionLog.executionTime, "ms");
            console.log("Logs de nodos:");
            (_a = executionLog === null || executionLog === void 0 ? void 0 : executionLog.logs) === null || _a === void 0 ? void 0 : _a.forEach((log) => {
                console.log(`[${log.timestamp.toISOString()}] ${log.nodeId} - ${log.action}: ${log.message}`);
            });
            return executionLog;
        }
        catch (error) {
            console.error("Error al ejecutar automatización:", error);
            throw error;
        }
    });
}
// Ejecutar la prueba completa
function runFullTest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Iniciando prueba completa...");
            const automation = yield createTestAutomation();
            yield runTestAutomation(automation);
            console.log("Prueba completada con éxito");
            // Cerrar la conexión
            yield mongoose_1.default.disconnect();
        }
        catch (error) {
            console.error("Error en la prueba:", error);
            yield mongoose_1.default.disconnect();
            process.exit(1);
        }
    });
}
// Función para crear una automatización de emails masivos de ejemplo
function createMassEmailAutomation() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Crear una automatización de ejemplo de envío masivo
            const automation = new AutomationModel_1.default({
                name: "Automatización de emails masivos",
                description: "Envía emails a todos los contactos de una lista",
                isActive: true,
                organizationId: new mongoose_1.default.Types.ObjectId(),
                createdBy: new mongoose_1.default.Types.ObjectId(),
                nodes: [
                    {
                        id: "1",
                        type: "trigger",
                        module: "manual", // Trigger manual, se ejecutará manualmente
                        event: "execute",
                        next: ["2"],
                    },
                    {
                        id: "2",
                        type: "send_mass_email",
                        listId: "ID_DE_TU_LISTA", // Aquí deberías colocar un ID real de una lista
                        subject: "Información importante para nuestros clientes",
                        emailBody: "<p>Hola {{contact.firstName}},</p><p>Te enviamos esta información importante...</p><p>Saludos,<br>El equipo</p>",
                        next: ["3"]
                    },
                    {
                        id: "3",
                        type: "transform",
                        transformations: [
                            {
                                outputField: "emailReport",
                                expression: "Emails enviados: {{massEmailResult.successCount}} de {{massEmailResult.totalContacts}}"
                            }
                        ]
                    }
                ],
            });
            yield automation.save();
            console.log("Automatización de emails masivos creada:", automation._id);
            return automation;
        }
        catch (error) {
            console.error("Error al crear automatización de emails masivos:", error);
            throw error;
        }
    });
}
// Ejecutar las pruebas
runFullTest();
