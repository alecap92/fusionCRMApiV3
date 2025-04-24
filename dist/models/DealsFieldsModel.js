"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const dealsFieldsSchema = new mongoose_1.Schema({
    pipeline: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("DealsField", dealsFieldsSchema);
