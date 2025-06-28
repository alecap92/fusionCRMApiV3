import { Schema, model, Document } from "mongoose";

export interface ILog extends Document {
  type: string;
  data: any;
  userId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  timestamp: Date;
}

const logSchema = new Schema<ILog>(
  {
    type: {
      type: String,
      required: true,
      enum: ["LOGOUT_ALL"], // Podemos agregar más tipos en el futuro
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Organization",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para mejorar el rendimiento de las consultas
logSchema.index({ type: 1, timestamp: -1 });
logSchema.index({ organizationId: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });

const LogModel = model<ILog>("Log", logSchema);

export default LogModel;
