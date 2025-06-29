import { Schema, model, Document } from "mongoose";

interface IProperty {
  value: string;
  key: string;
  isVisible: boolean;
}

interface IFile {
  _id: Schema.Types.ObjectId;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadDate: Date;
}
interface IContact extends Document {
  organizationId: Schema.Types.ObjectId;
  properties: IProperty[];
  createdAt: Date;
  updatedAt: Date;
  EmployeeOwner: string[];
  files: IFile[];
  leadScore: number;
}

const propertySchema = new Schema<IProperty>({
  value: { type: String },
  key: { type: String, required: true },
  isVisible: { type: Boolean },
});

const fileSchema = new Schema<IFile>({
  name: { type: String },
  type: { type: String },
  size: { type: Number },
  url: { type: String },
});

const contactSchema = new Schema<IContact>({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  properties: {
    type: [propertySchema],
    default: [
      { value: "", key: "firstName", isVisible: true },
      { value: "", key: "lastName", isVisible: true },
      { value: "", key: "position", isVisible: false },
      { value: "", key: "email", isVisible: false },
      { value: "", key: "phone", isVisible: true },
      { value: "", key: "mobile", isVisible: true },
      { value: "", key: "address", isVisible: false },
      { value: "", key: "city", isVisible: false },
      { value: "", key: "country", isVisible: false },
      { value: "", key: "comments", isVisible: false },
      { value: "", key: "idType", isVisible: false },
      { value: "", key: "idNumber", isVisible: false },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  EmployeeOwner: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  files: [fileSchema],
  leadScore: {
    type: Number,
    default: 0,
  },
});

export default model<IContact>("Contact", contactSchema);
