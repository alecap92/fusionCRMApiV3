import { Schema, model, Document, Types } from "mongoose";

interface IFilter {
  id: string;
  key: string;
  operator: string;
  value: string;
}

export interface IList extends Document {
  name: string;
  description?: string;
  filters: IFilter[];
  contactIds: Types.ObjectId[];
  isDynamic: boolean;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
}

const FilterSchema = new Schema<IFilter>(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false } // para evitar crear un _id por cada filtro
);

const ListSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: [true, "El nombre de la lista es requerido"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    filters: {
      type: [FilterSchema],
      default: [],
    },
    contactIds: {
      type: [Schema.Types.ObjectId],
      ref: "Contact",
      default: [],
    },
    isDynamic: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario es requerido"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "El ID de la organización es requerido"],
    },
  },
  {
    timestamps: true,
  }
);

ListSchema.index({ organizationId: 1, userId: 1 });

export default model<IList>("List", ListSchema);
