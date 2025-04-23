import { Schema, model, Document as MongooseDocument } from "mongoose";

interface IDocument extends MongooseDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: Schema.Types.ObjectId;
  uploadDate: Date;
  status: string;
  fileURL: string;
  previewURL?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  organizationId: Schema.Types.ObjectId;
}

const documentSchema = new Schema<IDocument>({
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  uploadDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'archived'],
    default: 'active'
  },
  fileURL: { type: String, required: true },
  previewURL: { type: String },
  description: { type: String },
  tags: [{ type: String }],
  metadata: { type: Schema.Types.Mixed },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
}, {
  timestamps: true
});

export default model<IDocument>("Document", documentSchema); 