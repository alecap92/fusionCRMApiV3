"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const propertySchema = new mongoose_1.Schema({
    value: { type: String },
    key: { type: String, required: true },
    isVisible: { type: Boolean },
});
const fileSchema = new mongoose_1.Schema({
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    url: { type: String },
});
const contactSchema = new mongoose_1.Schema({
    _id: {
        type: mongoose_1.Schema.Types.ObjectId,
        auto: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    properties: {
        type: [propertySchema],
        default: [
            { value: "", key: "firstName", isVisible: true },
            { value: "", key: "lastName", isVisible: true },
            { value: "", key: "position", isVisible: false },
            { value: "", key: "email", isVisible: false },
            { value: "", key: "phone", isVisible: true },
            { value: "", key: "mobile", isVisible: true },
            { value: "", key: "address", isVisible: false },
            { value: "", key: "city", isVisible: false },
            { value: "", key: "country", isVisible: false },
            { value: "", key: "comments", isVisible: false },
            { value: "", key: "idType", isVisible: false },
            { value: "", key: "idNumber", isVisible: false },
        ],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    EmployeeOwner: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    files: [fileSchema],
    leadScore: {
        type: Number,
        default: 0,
    },
});
exports.default = (0, mongoose_1.model)("Contact", contactSchema);
