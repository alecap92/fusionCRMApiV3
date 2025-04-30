import mongoose, { Schema, Document } from "mongoose";

export interface IKeyActivity {
  name: string;
  completed: boolean;
  completedAt?: Date;
}

export interface IChannel {
  name: string;
  description: string;
  completionPercentage: number;
  disabled: boolean;
  keyActivities: IKeyActivity[];
}

export interface IFunnelSection {
  id: string;
  title: string;
  leadCount: number;
  color: string;
  content: {
    title: string;
    description: string;
    channels: IChannel[];
  };
}

export interface IAudienceItem {
  name: string;
  completed: boolean;
  description: string;
  examples: string[];
}

export interface IAudienceSection {
  id: string;
  title: string;
  description: string;
  items: IAudienceItem[];
  tips: string[];
}

export interface IStrategy extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  funnel: {
    sections: IFunnelSection[];
  };
  audience: {
    sections: IAudienceSection[];
  };
}

const KeyActivitySchema = new Schema(
  {
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false }
);

const ChannelSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    completionPercentage: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    keyActivities: [KeyActivitySchema],
  },
  { _id: false }
);

const FunnelSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    leadCount: { type: Number, default: 0 },
    color: { type: String },
    content: {
      title: { type: String },
      description: { type: String },
      channels: [ChannelSchema],
    },
  },
  { _id: false }
);

const AudienceItemSchema = new Schema(
  {
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
    description: { type: String },
    examples: [String],
  },
  { _id: false }
);

const AudienceSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    items: [AudienceItemSchema],
    tips: [String],
  },
  { _id: false }
);

const StrategySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    funnel: {
      sections: [FunnelSectionSchema],
    },
    audience: {
      sections: [AudienceSectionSchema],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStrategy>("Strategy", StrategySchema);
