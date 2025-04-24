"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchaseOrder = exports.updatePurchaseOrder = exports.createPurchaseOrder = exports.getPurchaseOrderById = exports.getPurchaseOrders = void 0;
const PurchaseModel_1 = __importDefault(require("../../models/PurchaseModel"));
// Obtener todas las órdenes de compra
const getPurchaseOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    try {
        const purchaseOrders = yield PurchaseModel_1.default.find({ organizationId })
            .populate("supplierId")
            .populate("organizationId")
            .populate("userId");
        res.status(200).json(purchaseOrders);
        if (!purchaseOrders) {
            return res.status(404).json({ message: "Purchase orders not found" });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching purchase orders", error });
    }
});
exports.getPurchaseOrders = getPurchaseOrders;
// Obtener una orden de compra por ID
const getPurchaseOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const purchaseOrder = yield PurchaseModel_1.default.findById(id)
            .populate("supplierId")
            .populate("organizationId")
            .populate("userId");
        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase order not found" });
        }
        res.status(200).json(purchaseOrder);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching the purchase order", error });
    }
});
exports.getPurchaseOrderById = getPurchaseOrderById;
// Crear una nueva orden de compra
const createPurchaseOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    console.log(req.body);
    try {
        const newPurchaseOrder = new PurchaseModel_1.default(Object.assign(Object.assign({}, req.body), { organizationId,
            userId }));
        const savedPurchaseOrder = yield newPurchaseOrder.save();
        res.status(201).json(savedPurchaseOrder);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ message: "Error creating purchase order", error });
    }
});
exports.createPurchaseOrder = createPurchaseOrder;
// Actualizar una orden de compra existente
const updatePurchaseOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedPurchaseOrder = yield PurchaseModel_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedPurchaseOrder) {
            return res.status(404).json({ message: "Purchase order not found" });
        }
        res.status(200).json(updatedPurchaseOrder);
    }
    catch (error) {
        res
            .status(400)
            .json({ message: "Error updating the purchase order", error });
    }
});
exports.updatePurchaseOrder = updatePurchaseOrder;
// Eliminar una orden de compra
const deletePurchaseOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedPurchaseOrder = yield PurchaseModel_1.default.findByIdAndDelete(id);
        if (!deletedPurchaseOrder) {
            return res.status(404).json({ message: "Purchase order not found" });
        }
        res.status(200).json({ message: "Purchase order deleted successfully" });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error deleting the purchase order", error });
    }
});
exports.deletePurchaseOrder = deletePurchaseOrder;
