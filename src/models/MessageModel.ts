import { Schema, model, Document } from "mongoose";

interface IReaction {
  reaction: string;
  user: string;
  timestamp: Date;
}

interface IMessage extends Document {
  user: Schema.Types.ObjectId;
  organization: Schema.Types.ObjectId;
  from: string;
  to: string;
  message: string;
  mediaUrl?: string;
  mediaId?: string;
  filename?: string;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  type: string;
  direction: "incoming" | "outgoing";
  isRead?: boolean;
  possibleName?: string;
  replyToMessage?: string;
  messageId?: string;
  reactions?: IReaction[];
  conversation: Schema.Types.ObjectId;
}

const reactionSchema = new Schema<IReaction>({
  reaction: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: Date, required: true },
});

const messageSchema = new Schema<IMessage>({
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
  filename: { type: String },
  mimeType: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timestamp: { type: Date, required: true, default: Date.now },
  type: { type: String, required: true },
  direction: { type: String, required: true, enum: ["incoming", "outgoing"] },
  isRead: { type: Boolean, default: false }, // Solo aplica para "incoming"
  possibleName: { type: String }, // Podría ser opcional o no según tus necesidades
  replyToMessage: {
    type: Schema.Types.ObjectId,
    ref: "Message",
  },
  messageId: { type: String },
  reactions: [reactionSchema],
  conversation: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
});

// Agregar índice único compuesto para evitar duplicados
messageSchema.index(
  { messageId: 1, organization: 1 },
  { unique: true, sparse: true }
);

export default model<IMessage>("Message", messageSchema);
