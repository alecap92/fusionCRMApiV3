import { Schema, model, Document } from "mongoose";

interface IStatus extends Document {
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Schema.Types.ObjectId;
  pipeline: Schema.Types.ObjectId;
  color: string;
}

const statusSchema = new Schema<IStatus>(
  {
    name: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    pipeline: {
      type: Schema.Types.ObjectId,
      ref: "Pipeline",
      required: true,
    },
    color: {
      type: String,
      required: true,
      default: "#000000", // Default color
    },
  },
  {
    timestamps: true,
  }
);

export default model<IStatus>("Status", statusSchema);
