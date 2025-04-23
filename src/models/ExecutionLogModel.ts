// models/ExecutionLogModel.ts
import { Schema, model, Document, Types } from "mongoose";

/**
 * Estados posibles de una ejecución
 */
export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Interfaz para un log individual de nodo
 */
export interface INodeLog {
  timestamp: Date;
  nodeId: string;
  level: string;
  action: string;
  message: string;
}

/**
 * Interfaz principal para el modelo de log de ejecución
 */
export interface IExecutionLog extends Document {
  executionId: string;
  automationId: Types.ObjectId;
  organizationId: Types.ObjectId;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  executionTime?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  logs?: INodeLog[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Esquema para el modelo de log de ejecución
 */
const executionLogSchema = new Schema<IExecutionLog>(
  {
    executionId: {
      type: String,
      required: true,
      index: true,
    },
    automationId: {
      type: Schema.Types.ObjectId,
      ref: "Automation",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "skipped"],
      default: "queued",
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    executionTime: {
      type: Number,
    },
    input: {
      type: Schema.Types.Mixed,
    },
    output: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    logs: [
      {
        timestamp: Date,
        nodeId: String,
        level: String,
        action: String,
        message: String,
      },
    ],
  },
  { timestamps: true }
);

// Índices para consultas comunes
executionLogSchema.index({ automationId: 1, createdAt: -1 });
executionLogSchema.index({ organizationId: 1, createdAt: -1 });
executionLogSchema.index({ status: 1, organizationId: 1 });

const ExecutionLogModel = model<IExecutionLog>(
  "ExecutionLog",
  executionLogSchema
);

export default ExecutionLogModel;
