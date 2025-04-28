"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FilterSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    key: { type: String, required: true },
    operator: { type: String, required: true },
    value: {
        type: String,
        required: function () {
            // No requiere value cuando el operador es "is empty" o "is not empty"
            return !["is empty", "is not empty"].includes(this.operator);
        },
    },
}, { _id: false } // para evitar crear un _id por cada filtro
);
const ListSchema = new mongoose_1.Schema({
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
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: "Contact",
        default: [],
    },
    isDynamic: {
        type: Boolean,
        default: false,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "El ID del usuario es requerido"],
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "El ID de la organización es requerido"],
    },
}, {
    timestamps: true,
});
ListSchema.index({ organizationId: 1, userId: 1 });
exports.default = (0, mongoose_1.model)("List", ListSchema);
