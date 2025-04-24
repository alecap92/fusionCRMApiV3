"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Esquema de Mongoose
const automationSchema = new mongoose_1.Schema({
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
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    nodes: {
        type: [Object], // Usamos Object en lugar de Schema.Types.Mixed[]
        required: true,
        default: [],
    },
}, { timestamps: true });
// Validaciones
automationSchema.pre("save", function (next) {
    const automation = this;
    const nodes = automation.nodes;
    // Validar que haya al menos un nodo trigger
    const hasTrigger = nodes.some((node) => node.type === "trigger");
    if (!hasTrigger && nodes.length > 0) {
        return next(new Error("La automatización debe tener al menos un nodo trigger"));
    }
    // Validar conexiones entre nodos
    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const node of nodes) {
        // Verificar conexiones next
        if ("next" in node && node.next) {
            for (const nextId of node.next) {
                if (!nodeIds.has(nextId)) {
                    return next(new Error(`El nodo ${node.id} hace referencia a un nodo inexistente ${nextId}`));
                }
            }
        }
        // Verificar conexiones de nodos de condición
        if (node.type === "condition") {
            const conditionNode = node;
            for (const nextId of [
                ...conditionNode.trueNext,
                ...conditionNode.falseNext,
            ]) {
                if (!nodeIds.has(nextId)) {
                    return next(new Error(`El nodo de condición ${node.id} hace referencia a un nodo inexistente ${nextId}`));
                }
            }
        }
    }
    next();
});
const AutomationModel = (0, mongoose_1.model)("Automation", automationSchema);
exports.default = AutomationModel;
