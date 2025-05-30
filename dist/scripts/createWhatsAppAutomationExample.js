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
const AutomationModel_1 = __importDefault(require("../models/AutomationModel"));
const OrganizationModel_1 = __importDefault(require("../models/OrganizationModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
dotenv_1.default.config();
function createWhatsAppAutomationExample() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(process.env.MONGODB_CONNECTION);
            console.log("✅ Conectado a MongoDB");
            // Buscar una organización de ejemplo
            const organization = yield OrganizationModel_1.default.findOne();
            if (!organization) {
                console.error("❌ No se encontró ninguna organización");
                return;
            }
            // Buscar un usuario para asignarlo como creador
            const user = yield UserModel_1.default.findOne({
                _id: { $in: organization.employees },
            });
            if (!user) {
                console.error("❌ No se encontró ningún usuario");
                return;
            }
            console.log(`📊 Creando automatización para organización: ${organization.companyName}`);
            console.log(`👤 Usuario creador: ${user.firstName} ${user.lastName}`);
            // Crear una automatización de bienvenida con el editor visual
            const welcomeAutomation = yield AutomationModel_1.default.create({
                name: "Bienvenida WhatsApp Visual",
                description: "Automatización de bienvenida creada con el editor visual",
                organizationId: organization._id,
                isActive: true,
                automationType: "conversation",
                triggerType: "conversation_started",
                nodes: [
                    {
                        id: "trigger_1",
                        type: "trigger",
                        module: "whatsapp",
                        event: "conversation_started",
                        data: {},
                        next: ["action_1"],
                        position: { x: 100, y: 100 },
                    },
                    {
                        id: "action_1",
                        type: "action",
                        module: "whatsapp",
                        event: "send_message",
                        data: {
                            message: "¡Hola {{contact_name}}! 👋\n\n¡Bienvenido a nuestro servicio de atención por WhatsApp!\n\n¿En qué puedo ayudarte hoy?\n\n1️⃣ Información sobre productos\n2️⃣ Estado de mi pedido\n3️⃣ Soporte técnico\n4️⃣ Hablar con un agente\n\nPor favor, responde con el número de la opción que necesitas.",
                        },
                        next: ["delay_1"],
                        position: { x: 100, y: 250 },
                    },
                    {
                        id: "delay_1",
                        type: "delay",
                        module: "system",
                        data: {
                            delay: 30, // 30 segundos
                            delayType: "seconds",
                        },
                        next: ["condition_1"],
                        position: { x: 100, y: 400 },
                    },
                    {
                        id: "condition_1",
                        type: "condition",
                        module: "system",
                        data: {
                            condition: {
                                field: "message",
                                operator: "contains",
                                value: "1",
                            },
                        },
                        trueBranch: "action_2",
                        falseBranch: "action_3",
                        position: { x: 100, y: 550 },
                    },
                    {
                        id: "action_2",
                        type: "action",
                        module: "whatsapp",
                        event: "send_message",
                        data: {
                            message: "📦 *Nuestros Productos*\n\nTenemos una amplia gama de productos disponibles:\n\n• Producto A - $99\n• Producto B - $149\n• Producto C - $199\n\n¿Te gustaría más información sobre alguno en particular?",
                        },
                        next: [],
                        position: { x: -50, y: 700 },
                    },
                    {
                        id: "action_3",
                        type: "action",
                        module: "whatsapp",
                        event: "send_message",
                        data: {
                            message: "Entiendo que necesitas ayuda con otra opción. Un agente se pondrá en contacto contigo pronto. 👨‍💼",
                        },
                        next: ["action_4"],
                        position: { x: 250, y: 700 },
                    },
                    {
                        id: "action_4",
                        type: "action",
                        module: "system",
                        event: "notify_team",
                        data: {
                            message: "Cliente necesita atención personalizada",
                        },
                        next: [],
                        position: { x: 250, y: 850 },
                    },
                ],
                edges: [
                    { id: "e1", source: "trigger_1", target: "action_1" },
                    { id: "e2", source: "action_1", target: "delay_1" },
                    { id: "e3", source: "delay_1", target: "condition_1" },
                    { id: "e4", source: "condition_1", target: "action_2", type: "true" },
                    { id: "e5", source: "condition_1", target: "action_3", type: "false" },
                    { id: "e6", source: "action_3", target: "action_4" },
                ],
                conversationSettings: {
                    pauseOnUserReply: true,
                    maxMessagesPerSession: 5,
                    sessionTimeout: 30,
                },
                createdBy: user._id,
                stats: {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                },
            });
            console.log("✅ Automatización de bienvenida creada:", welcomeAutomation.name);
            // Crear una automatización por palabras clave
            const keywordAutomation = yield AutomationModel_1.default.create({
                name: "Respuestas por Palabras Clave",
                description: "Responde automáticamente a palabras clave específicas",
                organizationId: organization._id,
                isActive: true,
                automationType: "conversation",
                triggerType: "keyword",
                nodes: [
                    {
                        id: "trigger_keyword",
                        type: "trigger",
                        module: "whatsapp",
                        event: "keyword",
                        data: {
                            keywords: ["precio", "costo", "cuanto", "valor"],
                        },
                        next: ["action_price"],
                        position: { x: 100, y: 100 },
                    },
                    {
                        id: "action_price",
                        type: "action",
                        module: "whatsapp",
                        event: "send_message",
                        data: {
                            message: "💰 *Información de Precios*\n\nNuestros precios son:\n\n• Plan Básico: $29/mes\n• Plan Pro: $79/mes\n• Plan Enterprise: Contactar ventas\n\n¿Te gustaría conocer más detalles sobre algún plan?",
                        },
                        next: [],
                        position: { x: 100, y: 250 },
                    },
                ],
                edges: [
                    { id: "e_kw1", source: "trigger_keyword", target: "action_price" },
                ],
                triggerConditions: {
                    keywords: ["precio", "costo", "cuanto", "valor"],
                },
                conversationSettings: {
                    pauseOnUserReply: false,
                    maxMessagesPerSession: 10,
                    sessionTimeout: 60,
                },
                createdBy: user._id,
                stats: {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                },
            });
            console.log("✅ Automatización de palabras clave creada:", keywordAutomation.name);
            // Mostrar resumen
            const totalAutomations = yield AutomationModel_1.default.countDocuments({
                organizationId: organization._id,
            });
            const activeAutomations = yield AutomationModel_1.default.countDocuments({
                organizationId: organization._id,
                isActive: true,
            });
            console.log("\n📊 Resumen de automatizaciones:");
            console.log(`📝 Total: ${totalAutomations}`);
            console.log(`✅ Activas: ${activeAutomations}`);
            console.log("\n🎉 ¡Automatizaciones de WhatsApp creadas exitosamente!");
            console.log("Puedes editarlas desde el WorkflowEditor en el frontend");
        }
        catch (error) {
            console.error("❌ Error:", error);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log("\n👋 Desconectado de MongoDB");
        }
    });
}
// Ejecutar el script
createWhatsAppAutomationExample();
