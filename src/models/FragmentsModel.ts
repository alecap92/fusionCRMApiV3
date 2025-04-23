import { Schema, model, Document } from "mongoose";

interface IFragment extends Document {
  name: string;
  text: string;
  atajo: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  organizationId: string;
}

const fragmentSchema = new Schema<IFragment>(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    atajo: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    organizationId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const Fragment = model<IFragment>("Fragment", fragmentSchema);

export default Fragment;
