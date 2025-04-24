"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const fragmentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    text: { type: String, required: true },
    atajo: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    organizationId: { type: String, required: true },
}, {
    timestamps: true,
});
const Fragment = (0, mongoose_1.model)("Fragment", fragmentSchema);
exports.default = Fragment;
