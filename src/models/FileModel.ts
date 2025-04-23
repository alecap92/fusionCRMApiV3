import { Schema, model, Document } from "mongoose";

interface IFile extends Document {
  user: Schema.Types.ObjectId;
  organization: Schema.Types.ObjectId;
  name: string;
  fileType: string;
  mediaURL: string;
  createdAt: Date;
  updatedAt: Date;
  isVisible: boolean;
}

const fileSchema = new Schema<IFile>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  name: { type: String, required: true },
  fileType: { type: String, required: true },
  mediaURL: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isVisible: { type: Boolean, default: false },
});

export default model<IFile>("File", fileSchema);
