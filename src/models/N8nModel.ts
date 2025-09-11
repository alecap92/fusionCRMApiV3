import { Schema, model, Document, Types } from "mongoose";

export interface IN8n extends Document {
  endpoint: string;
  name: string;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  apiKey?: string;
  method: string;
  target: [string];
  needData?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const N8nSchema = new Schema<IN8n>(
  {
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    apiKey: {
      type: String,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      default: "POST",
    },
    target: {
      type: [String],
      required: true,
      enum: ["Mensajes", "Contactos", "Contacto", "Negocios"],
      default: ["Mensajes"],
    },
    needData: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IN8n>("N8n", N8nSchema);
