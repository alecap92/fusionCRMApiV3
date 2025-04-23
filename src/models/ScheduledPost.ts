import { Schema, model, Document, Types } from "mongoose";

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface IScheduledPost extends Document {
  organizationId: Types.ObjectId;
  socialAccountId: Types.ObjectId;
  content: string;
  mediaUrls: string[];
  scheduledFor: Date;
  status: PostStatus;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
  facebookAccountId?: string;
  instagramAccountId?: string;
  platforms: string[];
}

const scheduledPostSchema = new Schema<IScheduledPost>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    socialAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "failed"],
      default: "draft",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    facebookAccountId: {
      type: String,
      default: "",
    },
    instagramAccountId: {
      type: String,
      default: "",
    },
    platforms: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default model<IScheduledPost>("ScheduledPost", scheduledPostSchema);
