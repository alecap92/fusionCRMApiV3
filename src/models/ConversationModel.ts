import { Schema, Types, model } from "mongoose";

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

interface IAutomationSettings {
  isPaused: boolean;
  pausedUntil?: Date;
  pausedBy: "system" | Types.ObjectId | undefined;
  pauseReason?: string;
  lastAutomationTriggered?: Date;
  automationHistory: Array<{
    automationType: string;
    triggeredAt: Date;
    triggeredBy: "system" | Types.ObjectId | undefined;
  }>;
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
  automationSettings: IAutomationSettings;
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

const automationHistorySchema = new Schema({
  automationType: { type: String, required: true },
  triggeredAt: { type: Date, required: true },
  triggeredBy: {
    type: Schema.Types.Mixed,
    ref: "User",
    validate: {
      validator: function (v: any) {
        return (
          v === "system" ||
          v instanceof Types.ObjectId ||
          typeof v === "undefined"
        );
      },
      message: "triggeredBy debe ser 'system' o un ObjectId válido",
    },
  },
});

const automationSettingsSchema = new Schema<IAutomationSettings>({
  isPaused: { type: Boolean, default: false },
  pausedUntil: { type: Date },
  pausedBy: {
    type: Schema.Types.Mixed,
    ref: "User",
    validate: {
      validator: function (v: any) {
        return (
          v === "system" ||
          v instanceof Types.ObjectId ||
          typeof v === "undefined"
        );
      },
      message: "pausedBy debe ser 'system' o un ObjectId válido",
    },
  },
  pauseReason: {
    type: String,
    enum: ["30m", "1h", "3h", "6h", "12h", "1d", "forever"],
  },
  lastAutomationTriggered: { type: Date },
  automationHistory: [automationHistorySchema],
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
    automationSettings: {
      type: automationSettingsSchema,
      default: () => ({
        isPaused: false,
        automationHistory: [],
      }),
    },
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
// Nuevos índices para automatizaciones
conversationSchema.index({ "automationSettings.isPaused": 1 });
conversationSchema.index({ "automationSettings.pausedUntil": 1 });

export default model<IConversation>("Conversation", conversationSchema);
