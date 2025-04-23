import { Schema, model, Document } from "mongoose";

interface IFormResponse extends Document {
  formId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  responses: Record<string, any>;
  receivedAt: Date;
}

const FormResponseSchema = new Schema<IFormResponse>({
  formId: { type: Schema.Types.ObjectId, ref: "form", required: true },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  responses: { type: Schema.Types.Mixed, required: true }, // Se usa Mixed para almacenar datos dinámicos
  receivedAt: { type: Date, default: Date.now },
});

export const FormResponseModel = model<IFormResponse>(
  "FormResponse",
  FormResponseSchema
);
