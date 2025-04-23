import { Schema, model, Document } from "mongoose";

interface IFormSchema extends Document {
  userId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  name: string;
  fields: Array<{ fieldName: string; fieldType: string; required: boolean }>;
  createdAt: Date;
  updatedAt: Date;
  createContact: boolean;
}

const FormSchema = new Schema<IFormSchema>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  fields: [
    {
      fieldName: { type: String, required: true },
      fieldType: { type: String, required: true },
      required: { type: Boolean, required: true },
    },
  ],
  createContact: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const FormModel = model<IFormSchema>("form", FormSchema);
