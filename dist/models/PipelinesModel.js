"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const pipelinesSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Pipeline", pipelinesSchema);
