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
// tests/controller-test.ts
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const supertest_1 = __importDefault(require("supertest"));
const ExecutionLogModel_1 = __importDefault(require("../models/ExecutionLogModel"));
// Importar el router correcto según tu estructura de archivos
const automationRouter_1 = __importDefault(require("../routes/automationRouter"));
// Cargar variables de entorno
dotenv_1.default.config();
// Crear la aplicación Express
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
// Simular middleware de autenticación
// Modify to use IAuthRequest instead of Request
app.use((req, res, next) => {
    const userId = new mongoose_1.default.Types.ObjectId();
    const orgId = new mongoose_1.default.Types.ObjectId();
    req.user = {
        _id: userId.toString(),
        organizationId: orgId.toString(),
        email: "test@example.com",
        role: "admin",
    };
    next();
});
// Agregar las rutas de automatización
app.use("/api/v1/automations", automationRouter_1.default);
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
// Función para ejecutar las pruebas de API
function runApiTests() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("1. Crear una nueva automatización");
            const createResponse = yield (0, supertest_1.default)(app)
                .post("/api/v1/automations")
                .send({
                name: "Automatización API Test",
                description: "Creada a través de la API",
                nodes: [
                    {
                        id: "1",
                        type: "trigger",
                        module: "deals",
                        event: "created",
                        next: ["2"],
                    },
                    {
                        id: "2",
                        type: "http_request",
                        method: "POST",
                        url: "https://webhook.site/123456",
                        body: {
                            dealId: "{{deal._id}}",
                            message: "Nuevo trato creado",
                        },
                        next: ["3"],
                    },
                    {
                        id: "3",
                        type: "transform",
                        transformations: [
                            {
                                outputField: "notificationMessage",
                                expression: "'Nuevo trato: ' + deal.name",
                            },
                        ],
                        next: ["4"],
                    },
                    {
                        id: "4",
                        type: "send_email",
                        to: "ventas@example.com",
                        subject: "Nuevo trato creado",
                        emailBody: "<p>{{notificationMessage}}</p>",
                    },
                ],
            });
            console.log("Respuesta de creación:", createResponse.status, createResponse.body);
            const automationId = createResponse.body._id;
            console.log("\n2. Obtener la automatización creada");
            const getResponse = yield (0, supertest_1.default)(app).get(`/api/v1/automations/${automationId}`);
            console.log("Respuesta de obtención:", getResponse.status);
            console.log("\n3. Actualizar la automatización");
            const updateResponse = yield (0, supertest_1.default)(app)
                .patch(`/api/v1/automations/${automationId}`)
                .send({
                name: "Automatización Actualizada",
                isActive: true,
            });
            console.log("Respuesta de actualización:", updateResponse.status, {
                name: updateResponse.body.name,
                isActive: updateResponse.body.isActive,
            });
            console.log("\n4. Ejecutar la automatización");
            const executeResponse = yield (0, supertest_1.default)(app)
                .post(`/api/v1/automations/${automationId}/execute`)
                .send({
                testData: {
                    deal: {
                        _id: "ABC123",
                        name: "Contrato con Cliente XYZ",
                        value: 5000,
                    },
                },
            });
            console.log("Respuesta de ejecución:", executeResponse.status, executeResponse.body);
            // Esperar a que la ejecución termine
            yield new Promise((resolve) => setTimeout(resolve, 5000));
            // Verificar el log de ejecución
            const executionId = executeResponse.body.executionId;
            const executionLog = yield ExecutionLogModel_1.default.findOne({ executionId });
            console.log("\nLog de ejecución:");
            console.log("Estado:", executionLog === null || executionLog === void 0 ? void 0 : executionLog.status);
            console.log("Tiempo de ejecución:", executionLog === null || executionLog === void 0 ? void 0 : executionLog.executionTime, "ms");
            console.log("\n5. Obtener todas las automatizaciones");
            const getAllResponse = yield (0, supertest_1.default)(app).get("/api/v1/automations");
            console.log("Respuesta de obtener todas:", getAllResponse.status, {
                count: getAllResponse.body.length,
            });
            console.log("\n6. Eliminar la automatización");
            const deleteResponse = yield (0, supertest_1.default)(app).delete(`/api/v1/automations/${automationId}`);
            console.log("Respuesta de eliminación:", deleteResponse.status, deleteResponse.body);
            console.log("\nPruebas completadas con éxito");
        }
        catch (error) {
            console.error("Error en las pruebas de API:", error);
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
// Ejecutar las pruebas
runApiTests();
