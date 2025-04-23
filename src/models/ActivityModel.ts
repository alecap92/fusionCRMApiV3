import { Schema, model, Document } from "mongoose";

export interface IActivity extends Document {
  activityType: "Reunion" | "Llamada" | "Correo" | "Nota";
  title: string;
  date: string;
  ownerId?: Schema.Types.ObjectId;
  contactId: Schema.Types.ObjectId;
  notes?: string;
  status: "incomplete" | "complete";
  organizationId: Schema.Types.ObjectId;
  reminder?: string;
}

const activitySchema = new Schema<IActivity>(
  {
    activityType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["incomplete", "complete"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    reminder: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IActivity>("Activity", activitySchema);
