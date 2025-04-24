"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormModel = void 0;
const mongoose_1 = require("mongoose");
const FormSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    fields: [
        {
            fieldName: { type: String, required: true },
            fieldType: { type: String, required: true },
            required: { type: Boolean, required: true },
        },
    ],
    createContact: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
exports.FormModel = (0, mongoose_1.model)("form", FormSchema);
