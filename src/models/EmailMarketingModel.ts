import { Schema, model, Document, ObjectId } from "mongoose";

export interface IEmailMarketing extends Document {
  name: string;
  description?: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  emailTemplateId: ObjectId;
  recipients: ObjectId;
  scheduledAt?: Date;
  organizationId: ObjectId;
  userId: ObjectId;
}

const emailMarketingSchema = new Schema<IEmailMarketing>(
  {
    name: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "cancelled"],
      default: "draft",
    },
    emailTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "EmailTemplate",
      required: true,
    },
    recipients: { type: Schema.Types.ObjectId, required: true },
    scheduledAt: { type: Date },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

export default model<IEmailMarketing>("EmailMarketing", emailMarketingSchema);
