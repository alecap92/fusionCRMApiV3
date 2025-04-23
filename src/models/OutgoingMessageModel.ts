import { Schema, model, Document } from "mongoose";

interface IOutgoingMessage extends Document {
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
  direction: "outgoing";
  possibleName: string;
}

const outgoingMessageSchema = new Schema<IOutgoingMessage>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  direction: { type: String, default: "outgoing", enum: ["outgoing"] },
});

export default model<IOutgoingMessage>(
  "OutgoingMessage",
  outgoingMessageSchema
);
