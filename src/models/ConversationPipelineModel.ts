import { Schema, model, Document } from "mongoose";

interface IPipelineStage {
  name: string;
  order: number;
  color?: string;
  autoAssign?: boolean;
  assignToTeam?: Schema.Types.ObjectId;
}

interface IConversationPipeline extends Document {
  name: string;
  organization: Schema.Types.ObjectId;
  stages: IPipelineStage[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pipelineStageSchema = new Schema<IPipelineStage>({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  color: { type: String, default: "#808080" },
  autoAssign: { type: Boolean, default: false },
  assignToTeam: { type: Schema.Types.ObjectId, ref: "Team" },
});

const conversationPipelineSchema = new Schema<IConversationPipeline>(
  {
    name: { type: String, required: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    stages: [pipelineStageSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Índices para mejorar el rendimiento en búsquedas
conversationPipelineSchema.index({ organization: 1, isDefault: 1 });

export default model<IConversationPipeline>(
  "ConversationPipeline",
  conversationPipelineSchema
);
