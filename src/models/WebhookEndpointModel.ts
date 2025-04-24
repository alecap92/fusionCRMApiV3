// src/models/WebhookEndpointModel.ts
import { Schema, model, Document, Types } from "mongoose";

// Interfaz para el modelo WebhookEndpoint
export interface IWebhookEndpoint extends Document {
  name: string;
  description?: string;
  module: string;
  event: string;
  url?: string;
  uniqueId: string;
  secret: string;
  isActive: boolean;
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema para WebhookEndpoint
const webhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    uniqueId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Crear índices para búsquedas comunes
webhookEndpointSchema.index({ organizationId: 1 });
webhookEndpointSchema.index({ module: 1, event: 1 });
webhookEndpointSchema.index({ isActive: 1 });
webhookEndpointSchema.index({ uniqueId: 1 }, { unique: true });

const WebhookEndpointModel = model<IWebhookEndpoint>(
  "WebhookEndpoint",
  webhookEndpointSchema
);

export default WebhookEndpointModel;
