"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormResponseModel = void 0;
const mongoose_1 = require("mongoose");
const FormResponseSchema = new mongoose_1.Schema({
    formId: { type: mongoose_1.Schema.Types.ObjectId, ref: "form", required: true },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    responses: { type: mongoose_1.Schema.Types.Mixed, required: true }, // Se usa Mixed para almacenar datos dinámicos
    receivedAt: { type: Date, default: Date.now },
});
exports.FormResponseModel = (0, mongoose_1.model)("FormResponse", FormResponseSchema);
