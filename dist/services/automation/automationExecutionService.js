"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.automationExecutionService = exports.AutomationExecutionService = void 0;
// services/automation/automationExecutionService.ts
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios"));
const emailService_1 = require("../email/emailService");
const whatsAppService_1 = require("../whatsapp/whatsAppService");
const ExecutionLogModel_1 = __importDefault(require("../../models/ExecutionLogModel"));
/**
 * Servicio para la ejecución de automatizaciones
 */
class AutomationExecutionService {
    constructor() {
        this.emailService = new emailService_1.EmailService();
        this.whatsAppService = new whatsAppService_1.WhatsAppService();
    }
    /**
     * Ejecuta una automatización completa
     * @param automation - La automatización a ejecutar
     * @param initialData - Datos iniciales para la ejecución
     * @param executionId - ID opcional de la ejecución (se genera uno nuevo si no se proporciona)
     * @returns ID de la ejecución
     */
    executeAutomation(automation_1) {
        return __awaiter(this, arguments, void 0, function* (automation, initialData = {}, executionId) {
            var _a;
            // Generar ID de ejecución si no se proporciona
            const execId = executionId || new mongoose_1.default.Types.ObjectId().toString();
            try {
                // Crear un log de ejecución inicial
                yield this.createExecutionLog({
                    executionId: execId,
                    automationId: automation._id,
                    organizationId: automation.organizationId,
                    status: "running",
                    startedAt: new Date(),
                    input: initialData,
                });
                // Si la automatización no está activa, no ejecutar (a menos que sea una ejecución manual)
                if (!automation.isActive && !executionId) {
                    yield this.updateExecutionLog(execId, {
                        status: "skipped",
                        error: "La automatización no está activa",
                        completedAt: new Date(),
                    });
                    return execId;
                }
                // Encontrar los nodos de trigger para comenzar la ejecución
                const triggerNodes = automation.nodes.filter((node) => node.type === "trigger");
                if (triggerNodes.length === 0) {
                    throw new Error("La automatización no tiene nodos de trigger");
                }
                // Crear el contexto de ejecución inicial
                const executionContext = {
                    data: Object.assign({}, initialData),
                    logs: [],
                    executionId: execId,
                    automationId: ((_a = automation._id) === null || _a === void 0 ? void 0 : _a.toString()) || "",
                    organizationId: automation.organizationId.toString(),
                    startTime: Date.now(),
                };
                // Ejecutamos desde cada nodo trigger
                const triggerPromises = triggerNodes.map((triggerNode) => this.executeNode(triggerNode, automation.nodes, executionContext));
                yield Promise.all(triggerPromises);
                // Actualizar el log de ejecución como completado
                yield this.updateExecutionLog(execId, {
                    status: "completed",
                    completedAt: new Date(),
                    output: executionContext.data,
                    executionTime: Date.now() - executionContext.startTime,
                    logs: executionContext.logs,
                });
                return execId;
            }
            catch (error) {
                // Registrar error en el log de ejecución
                yield this.updateExecutionLog(execId, {
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                    completedAt: new Date(),
                });
                console.error(`[Automation Execution Error] ID: ${execId}`, error);
                throw error;
            }
        });
    }
    /**
     * Ejecuta un nodo específico y continúa con el flujo
     * @param node - Nodo a ejecutar
     * @param allNodes - Todos los nodos de la automatización
     * @param context - Contexto de ejecución actual
     */
    executeNode(node, allNodes, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Guardar la lista de todos los nodos en el contexto para que estén disponibles en callbacks
                context.allNodes = allNodes;
                // Registrar inicio de ejecución del nodo
                this.logNodeExecution(context, node.id, "start", node.type);
                // Variable para controlar si continuamos con los siguientes nodos
                let shouldContinue = true;
                // Ejecutar el nodo según su tipo
                switch (node.type) {
                    case "trigger":
                        // Los nodos trigger no ejecutan lógica, solo inician el flujo
                        break;
                    case "http_request":
                        context.data = yield this.executeHttpRequestNode(node, context);
                        break;
                    case "condition":
                        return yield this.executeConditionNode(node, allNodes, context);
                    case "send_email":
                        yield this.executeSendEmailNode(node, context);
                        break;
                    case "send_whatsapp":
                        yield this.executeSendWhatsAppNode(node, context);
                        break;
                    case "delay":
                        shouldContinue = yield this.executeDelayNode(node, context);
                        break;
                    case "transform":
                        context.data = yield this.executeTransformNode(node, context);
                        break;
                    case "send_mass_email":
                        yield this.executeSendMassEmailNode(node, context);
                        break;
                    case "contacts":
                        yield this.executeContactsNode(node, context);
                        break;
                    default:
                        throw new Error(`Tipo de nodo no soportado: ${node}`);
                }
                // Registrar éxito de ejecución del nodo
                this.logNodeExecution(context, node.id, "success", node.type);
                // Si el nodo indicó que la ejecución debe detenerse, no continuamos
                if (!shouldContinue) {
                    console.log(`⏸️ Deteniendo ejecución después del nodo ${node.id} de tipo ${node.type}`);
                    return;
                }
                // Continuar con los nodos siguientes
                if ("next" in node && node.next && node.next.length > 0) {
                    for (const nextNodeId of node.next) {
                        const nextNode = allNodes.find((n) => n.id === nextNodeId);
                        if (nextNode) {
                            yield this.executeNode(nextNode, allNodes, context);
                        }
                        else {
                            throw new Error(`Nodo siguiente no encontrado: ${nextNodeId}`);
                        }
                    }
                }
            }
            catch (error) {
                // Registrar error en la ejecución del nodo
                this.logNodeExecution(context, node.id, "error", node.type, error instanceof Error ? error.message : String(error));
                // Propagar el error
                throw error;
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo HTTP Request
     * @param node - Nodo HTTP Request
     * @param context - Contexto de ejecución
     * @returns Datos actualizados después de la ejecución
     */
    executeHttpRequestNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Preparar URL con variables reemplazadas
                const url = this.replaceTemplateVariables(node.url, context.data);
                // Preparar headers con variables reemplazadas
                const headers = {};
                if (node.headers) {
                    for (const [key, value] of Object.entries(node.headers)) {
                        headers[key] = this.replaceTemplateVariables(value, context.data);
                    }
                }
                // Preparar body con variables reemplazadas
                let data = undefined;
                if (node.body) {
                    data = this.replaceTemplateVariablesInObject(node.body, context.data);
                }
                // Configurar la petición
                const config = {
                    method: node.method.toLowerCase(),
                    url,
                    headers,
                    data,
                    timeout: 30000, // 30 segundos de timeout
                    validateStatus: () => true, // No lanzar errores por códigos de estado HTTP
                };
                // Ejecutar la petición
                const response = yield (0, axios_1.default)(config);
                // Registrar respuesta resumida en los logs
                this.logNodeExecution(context, node.id, "info", "http_response", `Status: ${response.status}, Response size: ${JSON.stringify(response.data).length} bytes`);
                // Devolver datos actualizados con la respuesta
                return Object.assign(Object.assign({}, context.data), { httpResponse: response.data, httpStatus: response.status, httpHeaders: response.headers });
            }
            catch (error) {
                console.error("Error en petición HTTP:", error);
                throw new Error(`Error en petición HTTP: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Condition
     * @param node - Nodo Condition
     * @param allNodes - Todos los nodos de la automatización
     * @param context - Contexto de ejecución
     */
    executeConditionNode(node, allNodes, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Evaluar todas las condiciones
            const results = node.conditions.map((condition) => {
                const fieldValue = this.getValueFromPath(context.data, condition.field);
                switch (condition.operator) {
                    case "equals":
                        return fieldValue === condition.value;
                    case "not_equals":
                        return fieldValue !== condition.value;
                    case "gt":
                        return fieldValue > condition.value;
                    case "lt":
                        return fieldValue < condition.value;
                    case "exists":
                        return fieldValue !== undefined && fieldValue !== null;
                    default:
                        return false;
                }
            });
            // Verificar si todas las condiciones son verdaderas (lógica AND)
            const allConditionsTrue = results.every((result) => result === true);
            // Registrar resultado de la evaluación
            this.logNodeExecution(context, node.id, "info", "condition_result", `Evaluación: ${allConditionsTrue ? "Verdadero" : "Falso"}`);
            // Seguir la ruta adecuada
            const nextNodeIds = allConditionsTrue ? node.trueNext : node.falseNext;
            // Continuar la ejecución con la ruta seleccionada
            for (const nextNodeId of nextNodeIds) {
                const nextNode = allNodes.find((n) => n.id === nextNodeId);
                if (nextNode) {
                    yield this.executeNode(nextNode, allNodes, context);
                }
                else {
                    throw new Error(`Nodo siguiente no encontrado: ${nextNodeId}`);
                }
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Send Email
     * @param node - Nodo Send Email
     * @param context - Contexto de ejecución
     */
    executeSendEmailNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Reemplazar variables en campos del email
                const to = this.replaceTemplateVariables(node.to, context.data);
                const subject = this.replaceTemplateVariables(node.subject, context.data);
                const emailBody = this.replaceTemplateVariables(node.emailBody, context.data);
                // Registrar intento de envío
                this.logNodeExecution(context, node.id, "info", "email_sending", `Enviando email a: ${to}`);
                // Enviar el email
                yield this.emailService.sendEmail({
                    to,
                    subject,
                    html: emailBody,
                    from: node.from || "ventas@manillasdecontrol.com", // Usar el from proporcionado o el predeterminado
                    organizationId: context.organizationId,
                });
                // Registrar envío exitoso
                this.logNodeExecution(context, node.id, "info", "email_sent", `Email enviado exitosamente a: ${to}`);
            }
            catch (error) {
                console.error("Error enviando email:", error);
                throw new Error(`Error enviando email: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Send WhatsApp
     * @param node - Nodo Send WhatsApp
     * @param context - Contexto de ejecución
     */
    executeSendWhatsAppNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Reemplazar variables en campos del mensaje
                const to = this.replaceTemplateVariables(node.to, context.data);
                const message = this.replaceTemplateVariables(node.message, context.data);
                // Registrar intento de envío
                this.logNodeExecution(context, node.id, "info", "whatsapp_sending", `Enviando WhatsApp a: ${to}`);
                // Enviar el mensaje de WhatsApp
                yield this.whatsAppService.sendMessage({
                    to,
                    message,
                    organizationId: context.organizationId,
                });
                // Registrar envío exitoso
                this.logNodeExecution(context, node.id, "info", "whatsapp_sent", `WhatsApp enviado exitosamente a: ${to}`);
            }
            catch (error) {
                console.error("Error enviando WhatsApp:", error);
                throw new Error(`Error enviando WhatsApp: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Delay
     * @param node - Nodo Delay
     * @param context - Contexto de ejecución
     * @returns False para indicar detener la ejecución, True para continuar
     */
    executeDelayNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const delayMinutes = node.delayMinutes;
                // Registrar inicio de espera
                this.logNodeExecution(context, node.id, "info", "delay_start", `Programando espera de ${delayMinutes} minutos`);
                // Importar el servicio de colas dinámicamente para evitar dependencias circulares
                const { queueService } = yield Promise.resolve().then(() => __importStar(require('../queue/queueService')));
                // Guardar el ID del nodo actual en el contexto
                context.currentNodeId = node.id;
                // Programar la continuación de la ejecución usando la cola
                const jobId = yield queueService.addDelayedExecution(delayMinutes, context.executionId, context.automationId, Object.assign({}, context), // Clonar el contexto para evitar problemas de referencia
                node.next || [], context.allNodes || [] // Pasar los nodos actuales en lugar de un array vacío
                );
                // Registrar la información del job en el log
                this.logNodeExecution(context, node.id, "info", "delay_queued", `Espera programada en cola con ID: ${jobId}`);
                // IMPORTANTE: Retornar false para indicar detener la ejecución
                return false;
            }
            catch (error) {
                console.error("Error al programar delay:", error);
                this.logNodeExecution(context, node.id, "error", "delay_error", `Error al programar la espera: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        });
    }
    /**
     * Continúa la ejecución de una automatización después de un delay
     * Este método es llamado por el worker de la cola
     * @param node - Nodo actual a ejecutar
     * @param allNodes - Todos los nodos de la automatización
     * @param context - Contexto de ejecución
     */
    continueExecution(node, allNodes, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Si no se proporcionaron nodos, cargarlos desde la base de datos
                let nodes = allNodes;
                if (!nodes || nodes.length === 0) {
                    const AutomationModel = require('../../models/AutomationModel').default;
                    const automation = yield AutomationModel.findById(context.automationId);
                    if (!automation) {
                        throw new Error(`Automatización no encontrada: ${context.automationId}`);
                    }
                    nodes = automation.nodes;
                }
                // Registrar la reanudación de la ejecución
                this.logNodeExecution(context, node.id, "info", "execution_resumed", `Reanudando ejecución después de delay`);
                // Ejecutar el nodo actual
                yield this.executeNode(node, nodes, context);
                // Actualizar el log de ejecución
                yield this.updateExecutionLog(context.executionId, {
                    logs: context.logs,
                    output: context.data,
                });
            }
            catch (error) {
                console.error("Error al continuar ejecución después de delay:", error);
                // Actualizar log de ejecución con el error
                yield this.updateExecutionLog(context.executionId, {
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                    completedAt: new Date(),
                    logs: context.logs,
                });
                throw error;
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Transform
     * @param node - Nodo Transform
     * @param context - Contexto de ejecución
     * @returns Datos actualizados después de la transformación
     */
    executeTransformNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Crear una copia de los datos actuales
                const updatedData = Object.assign({}, context.data);
                // Aplicar cada transformación
                for (const transformation of node.transformations) {
                    try {
                        // La expresión debe ser un string que puede contener referencias a los datos
                        // Por ejemplo: "contact.firstName + ' ' + contact.lastName"
                        const expression = this.replaceTemplateVariables(transformation.expression, context.data);
                        // Evaluamos la expresión en un contexto seguro con los datos actuales disponibles
                        // Nota: En producción, deberías usar una biblioteca como vm2 para evaluar expresiones de forma segura
                        // eslint-disable-next-line no-eval
                        const result = eval(`(() => { 
            const data = ${JSON.stringify(context.data)}; 
            return ${expression}; 
          })()`);
                        // Almacenar el resultado en la ruta especificada
                        this.setValueAtPath(updatedData, transformation.outputField, result);
                        // Registrar transformación exitosa
                        this.logNodeExecution(context, node.id, "info", "transform", `Campo ${transformation.outputField} definido con valor: ${JSON.stringify(result)}`);
                    }
                    catch (transformError) {
                        // Registrar error en la transformación individual
                        this.logNodeExecution(context, node.id, "warning", "transform_error", `Error en transformación ${transformation.outputField}: ${transformError instanceof Error ? transformError.message : String(transformError)}`);
                    }
                }
                return updatedData;
            }
            catch (error) {
                console.error("Error en transformación de datos:", error);
                throw new Error(`Error en transformación de datos: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Send Mass Email
     * @param node - Nodo Send Mass Email
     * @param context - Contexto de ejecución
     */
    executeSendMassEmailNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Importar modelos necesarios
                const ListModel = require("../../models/ListModel").default;
                const ContactModel = require("../../models/ContactModel").default;
                // Registrar inicio
                this.logNodeExecution(context, node.id, "info", "mass_email_start", `Iniciando envío masivo de correos para lista ${node.listId}`);
                // Obtener la lista de contactos
                const list = yield ListModel.findById(node.listId);
                if (!list) {
                    throw new Error(`Lista no encontrada: ${node.listId}`);
                }
                // Obtener contactos según el tipo de lista
                let contacts;
                if (list.isDynamic && ((_a = list.filters) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    const query = { organizationId: context.organizationId };
                    for (const filter of list.filters) {
                        switch (filter.operator) {
                            case "contains":
                                query[filter.key] = { $regex: filter.value, $options: "i" };
                                break;
                            case "equals":
                                query[filter.key] = filter.value;
                                break;
                        }
                    }
                    contacts = yield ContactModel.find(query).exec();
                }
                else {
                    contacts = yield ContactModel.find({
                        _id: { $in: list.contactIds },
                        organizationId: context.organizationId,
                    }).exec();
                }
                if (!contacts || contacts.length === 0) {
                    this.logNodeExecution(context, node.id, "warning", "mass_email_empty_list", "No se encontraron contactos en la lista");
                    return;
                }
                // Preparar el asunto y cuerpo del correo
                const subject = this.replaceTemplateVariables(node.subject, context.data);
                const baseEmailBody = this.replaceTemplateVariables(node.emailBody, context.data);
                // Contador de éxito
                let successCount = 0;
                let errorCount = 0;
                // Enviar correos a cada contacto (en lotes de 10 para no saturar el sistema)
                const batchSize = 10;
                for (let i = 0; i < contacts.length; i += batchSize) {
                    const batch = contacts.slice(i, i + batchSize);
                    // Procesar cada contacto en el lote en paralelo
                    yield Promise.all(batch.map((contact) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // Obtener email del contacto
                            const emailProperty = contact.properties.find((prop) => prop.key === "email");
                            const email = emailProperty === null || emailProperty === void 0 ? void 0 : emailProperty.value;
                            if (!email) {
                                return; // Saltar contactos sin email
                            }
                            // Personalizar el correo para este contacto
                            const personalizedEmailBody = this.personalizeEmailForContact(baseEmailBody, contact);
                            // Enviar el correo
                            yield this.emailService.sendEmail({
                                to: email,
                                subject,
                                html: personalizedEmailBody,
                                from: node.from || "ventas@manillasdecontrol.com", // Usar el from proporcionado o el predeterminado
                                organizationId: context.organizationId,
                            });
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.error(`Error enviando email a contacto ${contact._id}:`, error);
                            this.logNodeExecution(context, node.id, "warning", "email_send_error", `Error al enviar email a ${contact._id}: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    })));
                    // Actualizar logs de progreso cada lote
                    this.logNodeExecution(context, node.id, "info", "mass_email_progress", `Progreso: ${Math.min(i + batchSize, contacts.length)}/${contacts.length} emails procesados`);
                }
                // Registrar resultado final
                this.logNodeExecution(context, node.id, "success", "mass_email_completed", `Envío masivo completado: ${successCount} exitosos, ${errorCount} fallidos de ${contacts.length} contactos`);
                // Actualizar el contexto con información del resultado
                context.data.massEmailResult = {
                    totalContacts: contacts.length,
                    successCount,
                    errorCount,
                    listId: node.listId,
                    listName: list.name
                };
            }
            catch (error) {
                console.error("Error en envío masivo de emails:", error);
                throw new Error(`Error en envío masivo de emails: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Ejecuta un nodo de tipo Contacts
     * @param node - Nodo Contacts
     * @param context - Contexto de ejecución
     */
    executeContactsNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Importar el modelo de contacto
                const ContactModel = require("../../models/ContactModel").default;
                // Obtener la acción a realizar (create, update, delete, find)
                const action = node.action;
                // Registrar inicio de la acción
                this.logNodeExecution(context, node.id, "info", `contacts_${action}_start`, `Iniciando ${action} de contacto`);
                // Según la acción, realizar la operación correspondiente
                switch (action) {
                    case "create":
                        // Obtener datos del contacto (con sustitución de variables)
                        const contactData = this.replaceTemplateVariablesInObject(node.contactData || {}, context.data);
                        // Transformar los datos en el formato esperado por el modelo
                        const properties = Object.entries(contactData).map(([key, value]) => ({
                            key,
                            value: value || "",
                            isVisible: true
                        }));
                        // Crear el contacto
                        const newContact = yield ContactModel.create({
                            properties,
                            organizationId: context.organizationId,
                            source: "automation"
                        });
                        // Guardar el contacto creado en el contexto para usarlo en nodos posteriores
                        context.data.contact = newContact;
                        // Registrar éxito de la operación
                        this.logNodeExecution(context, node.id, "success", "contacts_create_success", `Contacto creado exitosamente con ID: ${newContact._id}`);
                        break;
                    case "update":
                        // Implementación para actualizar...
                        break;
                    case "delete":
                        // Implementación para eliminar...
                        break;
                    case "find":
                        // Implementación para buscar...
                        break;
                    default:
                        throw new Error(`Acción no soportada: ${action}`);
                }
            }
            catch (error) {
                // Guardar el error en el contexto
                context.data.error = {
                    message: error instanceof Error ? error.message : String(error),
                    timestamp: new Date()
                };
                // Registrar error
                console.error("Error en nodo contacts:", error);
                throw new Error(`Error en operación de contactos: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Personaliza el correo para un contacto específico
     */
    personalizeEmailForContact(emailTemplate, contact) {
        let personalized = emailTemplate;
        // Crear un objeto plano con las propiedades del contacto
        const contactData = {};
        if (Array.isArray(contact.properties)) {
            contact.properties.forEach((prop) => {
                contactData[prop.key] = prop.value || '';
            });
        }
        // Reemplazar variables
        for (const [key, value] of Object.entries(contactData)) {
            const regex = new RegExp(`{{contact.${key}}}`, 'g');
            personalized = personalized.replace(regex, value);
        }
        return personalized;
    }
    /**
     * Reemplaza variables de plantilla en un string
     * @param template - String con variables {{variable}}
     * @param data - Datos para reemplazar las variables
     * @returns String con variables reemplazadas
     */
    replaceTemplateVariables(template, data) {
        if (!template)
            return "";
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getValueFromPath(data, path.trim());
            return value !== undefined ? String(value) : match;
        });
    }
    /**
     * Reemplaza variables de plantilla en un objeto
     * @param obj - Objeto con variables {{variable}}
     * @param data - Datos para reemplazar las variables
     * @returns Objeto con variables reemplazadas
     */
    replaceTemplateVariablesInObject(obj, data) {
        if (!obj || typeof obj !== "object")
            return obj;
        const result = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                result[key] = this.replaceTemplateVariables(value, data);
            }
            else if (value !== null && typeof value === "object") {
                result[key] = this.replaceTemplateVariablesInObject(value, data);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Obtiene un valor desde una ruta en un objeto
     * @param obj - Objeto fuente
     * @param path - Ruta al valor (e.g. "user.profile.name")
     * @returns Valor encontrado o undefined
     */
    getValueFromPath(obj, path) {
        if (!obj || !path)
            return undefined;
        const parts = path.split(".");
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Establece un valor en una ruta específica de un objeto
     * @param obj - Objeto a modificar
     * @param path - Ruta donde establecer el valor (e.g. "user.profile.name")
     * @param value - Valor a establecer
     */
    setValueAtPath(obj, path, value) {
        if (!obj || !path)
            return;
        const parts = path.split(".");
        let current = obj;
        // Navegar hasta el penúltimo nivel
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            // Si la propiedad no existe, crearla
            if (!current[part] || typeof current[part] !== "object") {
                // Si el siguiente segmento parece un índice numérico, crear un array
                current[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
            }
            current = current[part];
        }
        // Establecer el valor en el último nivel
        const lastPart = parts[parts.length - 1];
        current[lastPart] = value;
    }
    /**
     * Registra un log de ejecución en el contexto
     * @param context - Contexto de ejecución
     * @param nodeId - ID del nodo
     * @param level - Nivel del log
     * @param action - Acción que se está registrando
     * @param message - Mensaje opcional
     */
    logNodeExecution(context, nodeId, level, action, message) {
        const log = {
            timestamp: new Date(),
            nodeId,
            level,
            action,
            message: message || "",
        };
        context.logs.push(log);
        // En un entorno de producción, podrías querer guardar inmediatamente en la base de datos
        // o enviar a un servicio de logging externo
        if (level === "error") {
            console.error(`[Automation Execution] ${nodeId} - ${action}: ${message}`);
        }
    }
    /**
     * Crea un nuevo log de ejecución en la base de datos
     * @param logData - Datos del log
     */
    createExecutionLog(logData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ExecutionLogModel_1.default.create(logData);
            }
            catch (error) {
                console.error("[Execution Log Error] Error al crear log de ejecución:", error);
            }
        });
    }
    /**
     * Actualiza un log de ejecución existente
     * @param executionId - ID de la ejecución
     * @param updateData - Datos a actualizar
     */
    updateExecutionLog(executionId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ExecutionLogModel_1.default.findOneAndUpdate({ executionId }, updateData, {
                    new: true,
                });
            }
            catch (error) {
                console.error("[Execution Log Error] Error al actualizar log de ejecución:", error);
            }
        });
    }
}
exports.AutomationExecutionService = AutomationExecutionService;
// Instancia singleton del servicio
exports.automationExecutionService = new AutomationExecutionService();
