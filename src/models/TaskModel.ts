import { Schema, model, Document } from "mongoose";

interface ITask extends Document {
  title: string;
  status: "No Iniciado" | "En Progreso" | "Revisión" | "Completado";
  dueDate: Date;
  timeline: string;
  budget: number;
  lastUpdated: Date;
  notes: string;
  priority: "Alta" | "Media" | "Baja";
  projectId: Schema.Types.ObjectId;
  ownerId: Schema.Types.ObjectId;
  responsibleId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Schema.Types.ObjectId;
  contactId: Schema.Types.ObjectId;
  tags: string[];
  description?: string; // Nueva propiedad opcional
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "No Iniciado",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    timeline: {
      type: String,
      required: false,
    },
    budget: {
      type: Number,
      required: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      required: false,
    },
    priority: {
      type: String,
      enum: ["Alta", "Media", "Baja"],
      default: "Baja",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact", // Nueva referencia al modelo de contactos
      required: false, // También opcional
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responsibleId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    tags: {
      type: [String],
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model<ITask>("Task", taskSchema);
