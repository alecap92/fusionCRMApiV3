import { Schema, model, Document } from "mongoose";

interface IParticipant {
  user: {
    type: "User";
    reference: Schema.Types.ObjectId;
  };
  contact: {
    type: "Contact";
    reference: string;
  };
}

interface IMetadata {
  key: string;
  value: any;
}

interface IConversation extends Document {
  title: string;
  organization: Schema.Types.ObjectId;
  participants: IParticipant;
  lastMessage: Schema.Types.ObjectId;
  lastMessageTimestamp: Date;
  unreadCount: number;
  pipeline: Schema.Types.ObjectId;
  currentStage: number; // representa el índice del stage en el pipeline
  assignedTo: Schema.Types.ObjectId;
  isResolved: boolean;
  priority: "low" | "medium" | "high";
  tags: string[];
  firstContactTimestamp: Date;
  metadata: IMetadata[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>({
  user: {
    type: { type: String, required: true, enum: ["User"] },
    reference: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  contact: {
    type: { type: String, required: true, enum: ["Contact"] },
    reference: { type: String, required: true },
  },
});

const metadataSchema = new Schema<IMetadata>({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
});

const conversationSchema = new Schema<IConversation>(
  {
    title: { type: String, required: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    participants: participantSchema,
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageTimestamp: { type: Date },
    unreadCount: { type: Number, default: 0 },
    pipeline: {
      type: Schema.Types.ObjectId,
      ref: "ConversationPipeline",
      required: true,
    },
    currentStage: { type: Number, default: 0 },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isResolved: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: [{ type: String }],
    firstContactTimestamp: { type: Date },
    metadata: [metadataSchema],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Índices para mejorar el rendimiento
conversationSchema.index({ organization: 1 });
conversationSchema.index({ pipeline: 1, currentStage: 1 });
conversationSchema.index({ assignedTo: 1 });
conversationSchema.index({ lastMessageTimestamp: -1 });
conversationSchema.index({ isResolved: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ leadScore: -1 });

export default model<IConversation>("Conversation", conversationSchema);
