"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const campanaSchema = new mongoose_1.Schema({
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Campana", campanaSchema);
