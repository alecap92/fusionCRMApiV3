import { Schema, model, Document } from "mongoose";

interface IIncomingMessage extends Document {
  user: Schema.Types.ObjectId;
  organization: Schema.Types.ObjectId;
  from: string;
  to: string;
  message: string;
  mediaUrl?: string;
  mediaId?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  type: string;
  direction: "incoming";
  isRead: boolean; // Nuevo campo para indicar si el mensaje ha sido leído
  possibleName?: string;
}

const incomingMessageSchema = new Schema<IIncomingMessage>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  mediaUrl: { type: String },
  mediaId: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timestamp: { type: Date, required: true, default: Date.now },
  type: { type: String, required: true },
  direction: { type: String, default: "incoming", enum: ["incoming"] },
  isRead: { type: Boolean, default: false }, // Campo para indicar si el mensaje ha sido leído
  possibleName: { type: String },
});

export default model<IIncomingMessage>(
  "IncomingMessage",
  incomingMessageSchema
);
