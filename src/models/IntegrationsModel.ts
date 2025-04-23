import { Schema, model, Document, Types } from "mongoose";

export interface IIntegration extends Document {
  organizationId: Types.ObjectId;
  service: string; // ej: "whatsapp", "formuapp", "openai"
  name?: string; // nombre visible, opcional
  isActive: boolean;
  credentials: Record<string, any>; // objeto flexible
  settings?: Record<string, any>; // opciones adicionales
  createdAt?: Date;
  updatedAt?: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    service: {
      type: String,
      required: true,
      enum: [
        "whatsapp",
        "formuapp",
        "openai",
        "sendinblue",
        "notion",
        "stripe",
        "claude",
        "googleMaps",
        // puedes agregar más aquí
      ],
    },
    name: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    credentials: {
      type: Schema.Types.Mixed, // objeto libre para tokens, claves, etc.
      required: true,
    },
    settings: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IIntegration>("Integration", IntegrationSchema);
