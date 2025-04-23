import { Schema, model, Document } from "mongoose";

interface ICampanaModel extends Document {
  createdBy: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  name: string;
  startDate?: Date;
  endDate?: Date;
  state?: string;
  budget?: number;
  expense?: number;
  objective?: string;
  notes?: string;
  totalRevenueGenerated?: number;
  totalExpenses?: number;
  newCustomersAcquired?: number;
  public?: {
    demographics?: string;
    interests?: string;
    location?: string;
    contactSource?: string;
  };
  platforms?: {
    platformName?: [];
    metricsName?: [];
  };
  conversionMetrics?: {
    platformName?: string;
    metric?: string;
    value?: number;
  };
}

const campanaSchema = new Schema<ICampanaModel>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    state: {
      type: String,
    },
    budget: {
      type: Number,
    },
    expense: {
      type: Number,
    },
    objective: {
      type: String,
    },
    notes: {
      type: String,
    },
    totalRevenueGenerated: {
      type: Number,
    },
    totalExpenses: {
      type: Number,
    },
    newCustomersAcquired: {
      type: Number,
    },
    public: {
      demographics: {
        type: String,
      },
      interests: {
        type: String,
      },
      location: {
        type: String,
      },
      contactSource: {
        type: String,
      },
    },
    platforms: {
      platformName: {
        type: [],
      },
      metricsName: {
        type: [],
      },
    },
    conversionMetrics: {
      platformName: {
        type: String,
      },
      metric: {
        type: String,
      },
      value: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

export default model<ICampanaModel>("Campana", campanaSchema);
