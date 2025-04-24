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
exports.queueService = exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_config_1 = require("../../config/redis.config");
const automationExecutionService_1 = require("../automation/automationExecutionService");
// Conexión a Redis (compartida por todas las colas)
const connection = new ioredis_1.default(redis_config_1.redisConfig);
// Opciones de conexión para BullMQ
const queueConnectionOptions = {
    connection,
};
/**
 * Servicio para gestionar colas de tareas relacionadas con automatizaciones
 */
class QueueService {
    // Inicialización privada (patrón Singleton)
    constructor() {
        // Crear cola para ejecuciones retrasadas
        this.delayQueue = new bullmq_1.Queue('automation-delays', queueConnectionOptions);
        // Agregar eventos de conexión a Redis
        connection.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
        connection.on('connect', () => {
            console.log('Successfully connected to Redis');
        });
        // Crear worker para procesar los trabajos
        this.delayWorker = new bullmq_1.Worker('automation-delays', (job) => __awaiter(this, void 0, void 0, function* () {
            yield this.processDelayedExecution(job);
        }), queueConnectionOptions);
        // Crear eventos para monitoreo
        this.queueEvents = new bullmq_1.QueueEvents('automation-delays', queueConnectionOptions);
        // Configurar manejadores de eventos
        this.setupEventHandlers();
        console.log('📋 Servicio de colas para automatizaciones inicializado');
    }
    /**
     * Obtener la instancia del servicio (Singleton)
     */
    static getInstance() {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }
    /**
     * Añadir una ejecución retrasada a la cola
     */
    addDelayedExecution(delayMinutes, executionId, automationId, context, nextNodes, allNodes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const job = yield this.delayQueue.add('delayed-execution', {
                    executionId,
                    automationId,
                    context,
                    nextNodes,
                    allNodes
                }, {
                    delay: delayMinutes * 60 * 1000, // Convertir minutos a milisegundos
                    removeOnComplete: true, // Eliminar trabajo cuando se complete
                    attempts: 3, // Intentos en caso de fallos
                    backoff: {
                        type: 'exponential',
                        delay: 5000 // 5 segundos entre reintentos, aumentando exponencialmente
                    }
                });
                console.log(`📝 Ejecución retrasada añadida a la cola: ${job.id} (${delayMinutes} minutos)`);
                return job.id;
            }
            catch (error) {
                console.error('Error al añadir trabajo a la cola:', error);
                throw error;
            }
        });
    }
    /**
     * Procesar una ejecución retrasada
     */
    processDelayedExecution(job) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`⏱️ Procesando ejecución retrasada: ${job.id}`);
            const { executionId, automationId, context, nextNodes, allNodes } = job.data;
            // Registrar la finalización del delay en el contexto (por si se necesita auditar)
            context.logs.push({
                timestamp: new Date(),
                nodeId: context.currentNodeId || 'unknown',
                level: 'info',
                action: 'delay_completed',
                message: `Retraso completado después de la cola (Job ID: ${job.id})`
            });
            try {
                // Verificar si tenemos todos los nodos. Si no, cargarlos desde la base de datos
                let nodesForExecution = allNodes;
                if (!nodesForExecution || nodesForExecution.length === 0) {
                    console.log('No se recibieron nodos en el job, cargando desde la base de datos...');
                    try {
                        const AutomationModel = require('../../models/AutomationModel').default;
                        const automation = yield AutomationModel.findById(automationId);
                        if (!automation) {
                            throw new Error(`Automatización no encontrada: ${automationId}`);
                        }
                        nodesForExecution = automation.nodes;
                        console.log(`Cargados ${nodesForExecution.length} nodos desde la base de datos`);
                    }
                    catch (loadError) {
                        console.error('Error cargando nodos desde la base de datos:', loadError);
                        throw loadError;
                    }
                }
                // Procesar los nodos siguientes
                for (const nextNodeId of nextNodes) {
                    const nextNode = nodesForExecution.find(node => node.id === nextNodeId);
                    if (nextNode) {
                        // Ejecutar el siguiente nodo en la automatización usando el método público
                        yield automationExecutionService_1.automationExecutionService.continueExecution(nextNode, nodesForExecution, context);
                    }
                    else {
                        console.error(`❌ Nodo siguiente no encontrado: ${nextNodeId}`);
                    }
                }
                console.log(`✅ Ejecución retrasada completada: ${job.id}`);
            }
            catch (error) {
                console.error(`❌ Error procesando ejecución retrasada ${job.id}:`, error);
                throw error; // Para que BullMQ lo maneje según la configuración de reintentos
            }
        });
    }
    /**
     * Configurar manejadores de eventos para monitoreo
     */
    setupEventHandlers() {
        // Eventos de la cola
        this.queueEvents.on('completed', ({ jobId }) => {
            console.log(`✅ Trabajo completado: ${jobId}`);
        });
        this.queueEvents.on('failed', ({ jobId, failedReason }) => {
            console.error(`❌ Trabajo fallido: ${jobId}`, failedReason);
        });
        // Eventos del worker
        this.delayWorker.on('error', err => {
            console.error('❌ Error en worker de delays:', err);
        });
    }
    /**
     * Cerrar conexiones al finalizar la aplicación
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.delayWorker.close();
            yield this.delayQueue.close();
            yield this.queueEvents.close();
            console.log('📋 Servicio de colas cerrado correctamente');
        });
    }
}
exports.QueueService = QueueService;
// Exportar una instancia del servicio
exports.queueService = QueueService.getInstance();
