import { Schema, model, Document } from "mongoose";

export interface IEmailTemplate extends Document {
  emailJson: object; // Cambiado de string a object
  emailHtml: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    emailJson: { type: Schema.Types.Mixed, required: true }, // 🔹 Cambiado de String a Mixed
    emailHtml: { type: String, required: true },
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  }
);

export default model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);
