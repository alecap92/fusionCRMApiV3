import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationNode {
  id: string;
  type: "trigger" | "action" | "condition" | "delay";
  module: string;
  event?: string;
  data?: {
    message?: string;
    delay?: number;
    delayType?: string;
    to?: string;
    subject?: string;
    emailBody?: string;
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
    condition?: {
      field: string;
      operator:
        | "equals"
        | "contains"
        | "starts_with"
        | "ends_with"
        | "regex"
        | "not_equals"
        | "greater_than"
        | "less_than";
      value: string;
    };
    payloadMatch?: any;
    webhookId?: string;
    keywords?: string[];
  };
  next?: string[];
  trueBranch?: string;
  falseBranch?: string;
  // Campos para compatibilidad con ReactFlow
  position?: {
    x: number;
    y: number;
  };
  selected?: boolean;
  dragging?: boolean;
  // Propiedad para matching de payload en webhooks
  payloadMatch?: any;
}

export interface IAutomation extends Document {
  name: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  isActive: boolean;
  nodes: IAutomationNode[];
  // Campo para compatibilidad con sistema visual
  edges?: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
  triggerType:
    | "message_received"
    | "conversation_started"
    | "keyword"
    | "scheduled"
    | "webhook"
    | "deal"
    | "contact"
    | "task"
    | "manual"
    | "whatsapp_message";
  triggerConditions?: {
    keywords?: string[];
    patterns?: string[];
    webhookId?: string;
    dealStatus?: {
      from?: string;
      to?: string;
    };
  };
  conversationSettings?: {
    pauseOnUserReply?: boolean;
    maxMessagesPerSession?: number;
    sessionTimeout?: number; // minutos
  };
  // Campos para el sistema visual
  automationType?: "workflow" | "conversation"; // workflow = visual, conversation = WhatsApp
  status?: "active" | "inactive" | "draft";
  lastRun?: Date;
  runsCount?: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  stats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutomationNodeSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ["trigger", "action", "condition", "delay"],
    required: true,
  },
  module: { type: String, required: true },
  event: { type: String },
  data: {
    message: { type: String },
    delay: { type: Number },
    delayType: { type: String },
    to: { type: String },
    subject: { type: String },
    emailBody: { type: String },
    url: { type: String },
    method: { type: String },
    headers: { type: Schema.Types.Mixed },
    body: { type: Schema.Types.Mixed },
    condition: {
      field: { type: String },
      operator: {
        type: String,
        enum: [
          "equals",
          "contains",
          "starts_with",
          "ends_with",
          "regex",
          "not_equals",
          "greater_than",
          "less_than",
        ],
      },
      value: { type: String },
    },
    payloadMatch: { type: Schema.Types.Mixed },
    webhookId: { type: String },
    keywords: [{ type: String }],
  },
  next: [{ type: String }],
  trueBranch: { type: String },
  falseBranch: { type: String },
  position: {
    x: { type: Number },
    y: { type: Number },
  },
  selected: { type: Boolean },
  dragging: { type: Boolean },
  payloadMatch: { type: Schema.Types.Mixed },
});

const EdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String },
});

const AutomationSchema = new Schema<IAutomation>(
  {
    name: { type: String, required: true },
    description: { type: String },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    isActive: { type: Boolean, default: false },
    nodes: [AutomationNodeSchema],
    edges: [EdgeSchema],
    triggerType: {
      type: String,
      enum: [
        "message_received",
        "conversation_started",
        "keyword",
        "scheduled",
        "webhook",
        "deal",
        "contact",
        "task",
        "manual",
        "whatsapp_message",
      ],
      required: true,
    },
    triggerConditions: {
      keywords: [{ type: String }],
      patterns: [{ type: String }],
      webhookId: { type: String },
      dealStatus: {
        from: { type: String },
        to: { type: String },
      },
    },
    conversationSettings: {
      pauseOnUserReply: { type: Boolean, default: true },
      maxMessagesPerSession: { type: Number, default: 10 },
      sessionTimeout: { type: Number, default: 30 }, // minutos
    },
    automationType: {
      type: String,
      enum: ["workflow", "conversation"],
      default: "workflow",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "inactive",
    },
    lastRun: { type: Date },
    runsCount: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    stats: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      lastExecutedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsqueda eficiente
AutomationSchema.index({ organizationId: 1, isActive: 1 });
AutomationSchema.index({ triggerType: 1, isActive: 1 });
AutomationSchema.index({ "triggerConditions.keywords": 1 });
AutomationSchema.index({ automationType: 1, organizationId: 1 });

// Método para determinar el tipo de trigger basado en los nodos
AutomationSchema.methods.detectTriggerType = function () {
  const triggerNode = this.nodes.find(
    (node: IAutomationNode) => node.type === "trigger"
  );
  if (!triggerNode) return "manual";

  // Mapear módulos a tipos de trigger
  if (triggerNode.module === "whatsapp") {
    if (triggerNode.event === "conversation_started")
      return "conversation_started";
    if (triggerNode.event === "keyword") return "keyword";
    if (triggerNode.event === "whatsapp_message") return "whatsapp_message";
    return "message_received";
  }

  if (triggerNode.module === "webhook") return "webhook";
  if (triggerNode.module === "deal" || triggerNode.module === "deals")
    return "deal";
  if (triggerNode.module === "contact" || triggerNode.module === "contacts")
    return "contact";
  if (triggerNode.module === "task" || triggerNode.module === "tasks")
    return "task";

  return "manual";
};

const AutomationModel = mongoose.model<IAutomation>(
  "Automation",
  AutomationSchema
);

export default AutomationModel;
