import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {redisConfig} from '../../config/redis.config';
import { AutomationNode } from '../../models/AutomationModel';
import { automationExecutionService } from '../automation/automationExecutionService';

// Conexión a Redis (compartida por todas las colas)
const connection = new Redis(redisConfig);

// Opciones de conexión para BullMQ
const queueConnectionOptions = {
  connection,
};

/**
 * Interfaces para los trabajos de la cola
 */
export interface DelayedExecutionJob {
  executionId: string;
  automationId: string;
  context: any;
  nextNodes: string[];
  allNodes: AutomationNode[];
}

/**
 * Servicio para gestionar colas de tareas relacionadas con automatizaciones
 */
export class QueueService {
  private static instance: QueueService;
  
  // Cola principal para ejecuciones retrasadas
  private delayQueue: Queue;
  private delayWorker: Worker;
  private queueEvents: QueueEvents;
  
  // Inicialización privada (patrón Singleton)
  private constructor() {
    // Crear cola para ejecuciones retrasadas
    this.delayQueue = new Queue('automation-delays', queueConnectionOptions);
    
     
  // Agregar eventos de conexión a Redis
  connection.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  connection.on('connect', () => {
    console.log('Successfully connected to Redis');
  });

    // Crear worker para procesar los trabajos
    this.delayWorker = new Worker('automation-delays', 
      async (job: Job<DelayedExecutionJob>) => {
        await this.processDelayedExecution(job);
      },
      queueConnectionOptions
    );
    
    // Crear eventos para monitoreo
    this.queueEvents = new QueueEvents('automation-delays', queueConnectionOptions);
    
    // Configurar manejadores de eventos
    this.setupEventHandlers();
    
    console.log('📋 Servicio de colas para automatizaciones inicializado');
  }
  
  /**
   * Obtener la instancia del servicio (Singleton)
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }
  
  /**
   * Añadir una ejecución retrasada a la cola
   */
  public async addDelayedExecution(
    delayMinutes: number,
    executionId: string,
    automationId: string,
    context: any,
    nextNodes: string[],
    allNodes: AutomationNode[]
  ): Promise<string> {
    try {
      const job = await this.delayQueue.add('delayed-execution', {
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
      return job.id as string;
    } catch (error) {
      console.error('Error al añadir trabajo a la cola:', error);
      throw error;
    }
  }
  
  /**
   * Procesar una ejecución retrasada
   */
  private async processDelayedExecution(job: Job<DelayedExecutionJob>): Promise<void> {
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
          const automation = await AutomationModel.findById(automationId);
          if (!automation) {
            throw new Error(`Automatización no encontrada: ${automationId}`);
          }
          nodesForExecution = automation.nodes;
          console.log(`Cargados ${nodesForExecution.length} nodos desde la base de datos`);
        } catch (loadError) {
          console.error('Error cargando nodos desde la base de datos:', loadError);
          throw loadError;
        }
      }
      
      // Procesar los nodos siguientes
      for (const nextNodeId of nextNodes) {
        const nextNode = nodesForExecution.find(node => node.id === nextNodeId);
        if (nextNode) {
          // Ejecutar el siguiente nodo en la automatización usando el método público
          await automationExecutionService.continueExecution(
            nextNode, 
            nodesForExecution, 
            context
          );
        } else {
          console.error(`❌ Nodo siguiente no encontrado: ${nextNodeId}`);
        }
      }
      
      console.log(`✅ Ejecución retrasada completada: ${job.id}`);
    } catch (error) {
      console.error(`❌ Error procesando ejecución retrasada ${job.id}:`, error);
      throw error; // Para que BullMQ lo maneje según la configuración de reintentos
    }
  }
  
  /**
   * Configurar manejadores de eventos para monitoreo
   */
  private setupEventHandlers() {
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
  public async close() {
    await this.delayWorker.close();
    await this.delayQueue.close();
    await this.queueEvents.close();
    console.log('📋 Servicio de colas cerrado correctamente');
  }
}

// Exportar una instancia del servicio
export const queueService = QueueService.getInstance(); 