"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const dealsFieldsValuesSchema = new mongoose_1.Schema({
    deal: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Deal",
        required: true,
    },
    field: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "DealsField",
        required: true,
    },
    value: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("DealsFieldValue", dealsFieldsValuesSchema);
