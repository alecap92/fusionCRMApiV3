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
const createSampleAutomation = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Conectar a MongoDB
        yield mongoose_1.default.connect(process.env.MONGODB_CONNECTION);
        console.log("✅ Conectado a MongoDB");
        // Buscar una organización y usuario para la automatización
        const organization = yield OrganizationModel_1.default.findOne({});
        const user = yield UserModel_1.default.findOne({});
        if (!organization || !user) {
            console.log("❌ No se encontró organización o usuario");
            return;
        }
        // Crear automatización de ejemplo: Chatbot de atención al cliente
        const chatbotAutomation = {
            name: "Chatbot de Atención al Cliente",
            description: "Automatización que responde preguntas frecuentes y deriva a un agente si es necesario",
            organizationId: organization._id,
            isActive: true,
            triggerType: "conversation_started",
            triggerConditions: {},
            conversationSettings: {
                pauseOnUserReply: true,
                maxMessagesPerSession: 20,
                sessionTimeout: 30,
            },
            createdBy: user._id,
            nodes: [
                // 1. Trigger: Cuando inicia una conversación
                {
                    id: "trigger_1",
                    type: "trigger",
                    module: "whatsapp",
                    event: "conversation_started",
                    next: ["action_welcome"],
                },
                // 2. Acción: Mensaje de bienvenida
                {
                    id: "action_welcome",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "¡Hola {{contact_name}}! 👋\n\nSoy el asistente virtual de FUSIONCOL. ¿En qué puedo ayudarte hoy?\n\n1️⃣ Información sobre productos\n2️⃣ Estado de mi pedido\n3️⃣ Soporte técnico\n4️⃣ Hablar con un agente\n\nPor favor, responde con el número de la opción que necesitas.",
                    },
                    next: ["condition_menu"],
                },
                // 3. Condición: Evaluar respuesta del menú
                {
                    id: "condition_menu",
                    type: "condition",
                    module: "system",
                    data: {
                        condition: {
                            field: "message",
                            operator: "equals",
                            value: "1",
                        },
                    },
                    trueBranch: "action_products",
                    falseBranch: "condition_menu_2",
                },
                // 4. Rama: Información de productos
                {
                    id: "action_products",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "📦 *Nuestros productos principales:*\n\n• Sistema CRM completo\n• Automatización de WhatsApp\n• Gestión de contactos\n• Pipeline de ventas\n• Reportes y analíticas\n\n¿Te gustaría saber más sobre algún producto en particular?",
                    },
                    next: ["condition_more_info"],
                },
                // 5. Condición alternativa para opción 2
                {
                    id: "condition_menu_2",
                    type: "condition",
                    module: "system",
                    data: {
                        condition: {
                            field: "message",
                            operator: "equals",
                            value: "2",
                        },
                    },
                    trueBranch: "action_order_status",
                    falseBranch: "condition_menu_3",
                },
                // 6. Rama: Estado de pedido
                {
                    id: "action_order_status",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "📋 Para consultar el estado de tu pedido, por favor proporciona:\n\n• Número de pedido\n• O tu correo electrónico registrado\n\nNuestro equipo te responderá en breve con la información actualizada.",
                    },
                    next: ["action_transfer_agent"],
                },
                // 7. Condición para opción 3
                {
                    id: "condition_menu_3",
                    type: "condition",
                    module: "system",
                    data: {
                        condition: {
                            field: "message",
                            operator: "equals",
                            value: "3",
                        },
                    },
                    trueBranch: "action_support",
                    falseBranch: "condition_menu_4",
                },
                // 8. Rama: Soporte técnico
                {
                    id: "action_support",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "🛠️ *Soporte Técnico*\n\nPor favor describe brevemente tu problema:\n\n• ¿Qué estabas intentando hacer?\n• ¿Qué error o problema encontraste?\n• ¿Desde cuándo ocurre?\n\nUn agente técnico te atenderá pronto.",
                    },
                    next: ["action_transfer_agent"],
                },
                // 9. Condición para opción 4 o cualquier otra
                {
                    id: "condition_menu_4",
                    type: "condition",
                    module: "system",
                    data: {
                        condition: {
                            field: "message",
                            operator: "equals",
                            value: "4",
                        },
                    },
                    trueBranch: "action_transfer_agent",
                    falseBranch: "action_invalid_option",
                },
                // 10. Opción inválida
                {
                    id: "action_invalid_option",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "❌ No entendí tu respuesta. Por favor responde con un número del 1 al 4:\n\n1️⃣ Información sobre productos\n2️⃣ Estado de mi pedido\n3️⃣ Soporte técnico\n4️⃣ Hablar con un agente",
                    },
                    next: ["condition_menu"],
                },
                // 11. Transferir a agente
                {
                    id: "action_transfer_agent",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "👤 Te estoy transfiriendo con un agente humano. Por favor espera un momento...\n\n⏱️ Tiempo estimado de espera: 2-5 minutos",
                    },
                    next: ["action_notify_agent"],
                },
                // 12. Notificar al equipo
                {
                    id: "action_notify_agent",
                    type: "action",
                    module: "system",
                    event: "notify_team",
                    data: {
                        message: "Cliente requiere atención humana",
                    },
                },
                // 13. Condición para más información
                {
                    id: "condition_more_info",
                    type: "condition",
                    module: "system",
                    data: {
                        condition: {
                            field: "message",
                            operator: "contains",
                            value: "sí",
                        },
                    },
                    trueBranch: "action_detailed_info",
                    falseBranch: "action_anything_else",
                },
                // 14. Información detallada
                {
                    id: "action_detailed_info",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "📱 *CRM WhatsApp Business*\n\n✅ Gestión unificada de conversaciones\n✅ Automatizaciones personalizables\n✅ Reportes en tiempo real\n✅ Integración con tu sitio web\n✅ API para desarrolladores\n\n💰 Planes desde $29/mes\n\n¿Te gustaría agendar una demo?",
                    },
                    next: ["action_end"],
                },
                // 15. Preguntar si necesita algo más
                {
                    id: "action_anything_else",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "¿Hay algo más en lo que pueda ayudarte? 😊",
                    },
                    next: ["action_end"],
                },
                // 16. Finalizar
                {
                    id: "action_end",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "¡Gracias por contactarnos! Si necesitas más ayuda, no dudes en escribirnos nuevamente. ¡Que tengas un excelente día! 🌟",
                    },
                },
            ],
        };
        // Crear la automatización
        const automation = yield AutomationModel_1.default.create(chatbotAutomation);
        console.log(`✅ Automatización creada: ${automation.name} (ID: ${automation._id})`);
        // Crear una segunda automatización: Respuesta a palabras clave
        const keywordAutomation = {
            name: "Respuestas a Palabras Clave",
            description: "Responde automáticamente a preguntas frecuentes basadas en palabras clave",
            organizationId: organization._id,
            isActive: true,
            triggerType: "keyword",
            triggerConditions: {
                keywords: ["precio", "costo", "cuánto", "valor", "pago"],
            },
            conversationSettings: {
                pauseOnUserReply: false,
                maxMessagesPerSession: 5,
                sessionTimeout: 60,
            },
            createdBy: user._id,
            nodes: [
                {
                    id: "trigger_keyword",
                    type: "trigger",
                    module: "whatsapp",
                    event: "keyword_detected",
                    next: ["action_pricing"],
                },
                {
                    id: "action_pricing",
                    type: "action",
                    module: "whatsapp",
                    event: "send_message",
                    data: {
                        message: "💰 *Información de Precios*\n\n• Plan Básico: $29/mes\n• Plan Profesional: $79/mes\n• Plan Empresa: $199/mes\n\nTodos incluyen:\n✅ Usuarios ilimitados\n✅ Soporte 24/7\n✅ Actualizaciones gratuitas\n\n📞 ¿Te gustaría que un asesor te contacte?",
                    },
                },
            ],
        };
        const automation2 = yield AutomationModel_1.default.create(keywordAutomation);
        console.log(`✅ Automatización creada: ${automation2.name} (ID: ${automation2._id})`);
        console.log("\n🎉 ¡Automatizaciones de ejemplo creadas exitosamente!");
        console.log("\n📝 Resumen:");
        console.log(`1. ${chatbotAutomation.name}: Flujo completo con menú y condicionales`);
        console.log(`2. ${keywordAutomation.name}: Respuesta automática a palabras clave`);
    }
    catch (error) {
        console.error("❌ Error creando automatizaciones:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
        console.log("🔌 Desconectado de MongoDB");
    }
});
// Ejecutar el script
if (require.main === module) {
    createSampleAutomation()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = createSampleAutomation;
