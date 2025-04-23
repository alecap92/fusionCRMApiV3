import { Schema, model, Document } from "mongoose";

interface IDeal extends Document {
  title: string;
  amount: number;
  closingDate: Date;
  pipeline: Schema.Types.ObjectId;
  status: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Schema.Types.ObjectId;
  associatedContactId: Schema.Types.ObjectId;
  associatedCompanyId: Schema.Types.ObjectId;
}

const dealsSchema = new Schema<IDeal>(
  {
    title: {
      type: String,
    },
    amount: {
      type: Number,
    },
    closingDate: {
      type: Date,
    },
    pipeline: {
      type: Schema.Types.ObjectId,
      ref: "Pipeline",
      required: true,
    },
    status: {
      type: Schema.Types.ObjectId,
      ref: "Status",
      default: null,
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
    associatedContactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
    },
    associatedCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  {
    timestamps: true,
  }
);

export default model<IDeal>("Deal", dealsSchema);
