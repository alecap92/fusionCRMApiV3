import { Schema, model, Document } from "mongoose";

interface IDealsField extends Document {
  pipeline: Schema.Types.ObjectId;
  name: string;
  key: string;
  type?: string;
  options?: Array<string>;
  required?: boolean;
}

const dealsFieldsSchema = new Schema<IDealsField>(
  {
    pipeline: {
      type: Schema.Types.ObjectId,
      ref: "Pipeline",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "text",
    },
    options: {
      type: Array,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IDealsField>("DealsField", dealsFieldsSchema);
