import { Schema, model, Document } from "mongoose";

interface IDealsFieldValue extends Document {
  deal: Schema.Types.ObjectId;
  field: Schema.Types.ObjectId;
  value: string;
}

const dealsFieldsValuesSchema = new Schema<IDealsFieldValue>(
  {
    deal: {
      type: Schema.Types.ObjectId,
      ref: "Deal",
      required: true,
    },
    field: {
      type: Schema.Types.ObjectId,
      ref: "DealsField",
      required: true,
    },
    value: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default model<IDealsFieldValue>(
  "DealsFieldValue",
  dealsFieldsValuesSchema
);
