import { Schema, model, Document } from "mongoose";

interface IPipeline extends Document {
  title: string;
  organizationId: Schema.Types.ObjectId;
}

const pipelinesSchema = new Schema<IPipeline>(
  {
    title: {
      type: String,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IPipeline>("Pipeline", pipelinesSchema);
