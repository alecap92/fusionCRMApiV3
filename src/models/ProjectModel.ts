import { Schema, model, Document } from "mongoose";

interface IProject extends Document {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  createdAt: Date;
  updatedAt: Date;
  organizationId: Schema.Types.ObjectId;
  ownerId: Schema.Types.ObjectId;
  status: string;
  color: string;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    budget: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    color: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IProject>("Project", projectSchema);
