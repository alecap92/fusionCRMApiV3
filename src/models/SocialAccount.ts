import { Schema, model, Document, Types } from "mongoose";

export type Platform = "facebook" | "instagram";

export interface ISocialAccount extends Document {
  organizationId: Types.ObjectId;
  platform: Platform;
  accountId?: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  picture?: string;
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    platform: {
      type: String,
      enum: ["facebook", "instagram"],
      required: true,
    },
    accountId: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    picture: {
      type: String,
    },
  },
  { timestamps: true }
);

export default model<ISocialAccount>("SocialAccount", socialAccountSchema);
