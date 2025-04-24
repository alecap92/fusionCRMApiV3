import { Schema, model, Document, Types } from "mongoose";

// Tipos de nodos
export type NodeType =
  | "trigger"
  | "http_request"
  | "condition"
  | "send_email"
  | "send_whatsapp"
  | "delay"
  | "transform"
  | "send_mass_email"
  | "contacts";

// Tipos de operadores para condiciones
export type ConditionOperator =
  | "exists"
  | "equals"
  | "not_equals"
  | "gt"
  | "lt"
  | "contains";

// Estructura de una condición
export interface IAutomationCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

// Interfaz base para todos los nodos
export interface BaseNode {
  id: string;
  type: NodeType;
}

// Nodo Trigger
export interface TriggerNode extends BaseNode {
  type: "trigger";
  module: string;
  event: string;
  payloadMatch?: Record<string, any>;
  next: string[];
}

// Nodo HTTP Request
export interface HttpRequestNode extends BaseNode {
  type: "http_request";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  next: string[];
}

// Nodo Condition
export interface ConditionNode extends BaseNode {
  type: "condition";
  conditions: IAutomationCondition[];
  trueNext: string[];
  falseNext: string[];
}

// Nodo Send Email
export interface SendEmailNode extends BaseNode {
  type: "send_email";
  to: string;
  subject: string;
  emailBody: string;
  next?: string[];
  from?: string;
}

// Nodo Send WhatsApp
export interface SendWhatsAppNode extends BaseNode {
  type: "send_whatsapp";
  to: string;
  message: string;
  next?: string[];
}

// Nodo Delay
export interface DelayNode extends BaseNode {
  type: "delay";
  delayMinutes: number;
  next: string[];
}

// Nodo Transform
export interface TransformNode extends BaseNode {
  type: "transform";
  transformations: Array<{
    outputField: string;
    expression: string;
  }>;
  next: string[];
}

// Nodo Send Mass Email
export interface SendMassEmailNode extends BaseNode {
  type: "send_mass_email";
  listId: string;         // ID de la lista de contactos
  subject: string;        // Asunto del correo
  emailBody: string;      // Cuerpo del correo (puede contener variables)
  from?: string;          // Remitente (opcional, si no se proporciona se usará el predeterminado)
  next?: string[];        // Referencias a los siguientes nodos
}

// Nodo Contacts
export interface ContactsNode extends BaseNode {
  type: "contacts";
  action: "create" | "update" | "delete" | "find";
  contactData?: Record<string, any>;  // Datos del contacto para crear o actualizar
  contactId?: string;                // ID del contacto para actualizar o eliminar
  next?: string[];                   // Referencias a los siguientes nodos
}

// Unión de todos los tipos de nodos
export type AutomationNode =
  | TriggerNode
  | HttpRequestNode
  | ConditionNode
  | SendEmailNode
  | SendWhatsAppNode
  | DelayNode
  | TransformNode
  | SendMassEmailNode
  | ContactsNode;

// Interfaz para el documento de Mongoose
export interface IAutomationDocument extends Document {
  createdBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  nodes: any[]; // Usamos any[] para el tipo interno de Mongoose
  createdAt: Date;
  updatedAt: Date;
}

// Interfaz para el modelo (con tipado correcto para los nodos)
export interface IAutomation {
  _id?: Types.ObjectId;
  createdBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  nodes: AutomationNode[];
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose
const automationSchema = new Schema<IAutomationDocument>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    nodes: {
      type: [Object], // Usamos Object en lugar de Schema.Types.Mixed[]
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

// Validaciones
automationSchema.pre("save", function (next) {
  const automation = this as IAutomationDocument;
  const nodes = automation.nodes as unknown as AutomationNode[];

  // Validar que haya al menos un nodo trigger
  const hasTrigger = nodes.some((node) => node.type === "trigger");
  if (!hasTrigger && nodes.length > 0) {
    return next(
      new Error("La automatización debe tener al menos un nodo trigger")
    );
  }

  // Validar conexiones entre nodos
  const nodeIds = new Set(nodes.map((node) => node.id));

  for (const node of nodes) {
    // Verificar conexiones next
    if ("next" in node && node.next) {
      for (const nextId of node.next) {
        if (!nodeIds.has(nextId)) {
          return next(
            new Error(
              `El nodo ${node.id} hace referencia a un nodo inexistente ${nextId}`
            )
          );
        }
      }
    }

    // Verificar conexiones de nodos de condición
    if (node.type === "condition") {
      const conditionNode = node as ConditionNode;
      for (const nextId of [
        ...conditionNode.trueNext,
        ...conditionNode.falseNext,
      ]) {
        if (!nodeIds.has(nextId)) {
          return next(
            new Error(
              `El nodo de condición ${node.id} hace referencia a un nodo inexistente ${nextId}`
            )
          );
        }
      }
    }
  }

  next();
});

const AutomationModel = model<IAutomationDocument>(
  "Automation",
  automationSchema
);

export default AutomationModel;
