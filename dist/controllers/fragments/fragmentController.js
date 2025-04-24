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
exports.searchFragment = exports.deleteFragment = exports.updateFragment = exports.getFragmentById = exports.getFragments = exports.createFragment = void 0;
const FragmentsModel_1 = __importDefault(require("../../models/FragmentsModel"));
// Crear un nuevo Fragment
const createFragment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { name, text, atajo } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
    try {
        const newFragment = new FragmentsModel_1.default({
            name,
            text,
            atajo,
            userId,
            organizationId,
        });
        const savedFragment = yield newFragment.save();
        res.status(201).json(savedFragment);
    }
    catch (error) {
        console.error("Error creating fragment:", error);
        res.status(500).json({ message: "Error creating fragment", error });
    }
});
exports.createFragment = createFragment;
// Obtener todos los Fragments
const getFragments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    const limit = Number(req.query.limit) || 5;
    const page = Number(req.query.page) || 1;
    const skip = (Number(req.query.page) - 1) * limit || 0;
    if (!organizationId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const fragments = yield FragmentsModel_1.default.find({
            organizationId,
        })
            .limit(limit)
            .skip(skip);
        const totalFragments = yield FragmentsModel_1.default.countDocuments({
            organizationId,
        });
        res.status(200).json({
            fragments,
            totalPages: Math.ceil(totalFragments / limit),
            currentPage: page,
            totalFragments,
        });
    }
    catch (error) {
        console.error("Error retrieving fragments:", error);
        res.status(500).json({ message: "Error retrieving fragments", error });
    }
});
exports.getFragments = getFragments;
// Obtener un Fragment por ID
const getFragmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const fragment = yield FragmentsModel_1.default.findById(id);
        if (!fragment) {
            return res.status(404).json({ message: "Fragment not found" });
        }
        res.status(200).json(fragment);
    }
    catch (error) {
        console.error("Error retrieving fragment:", error);
        res.status(500).json({ message: "Error retrieving fragment", error });
    }
});
exports.getFragmentById = getFragmentById;
// Actualizar un Fragment
const updateFragment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, text, atajo } = req.body;
    try {
        const fragment = yield FragmentsModel_1.default.findById(id);
        if (!fragment) {
            return res.status(404).json({ message: "Fragment not found" });
        }
        fragment.name = name || fragment.name;
        fragment.text = text || fragment.text;
        fragment.atajo = atajo || fragment.atajo;
        const updatedFragment = yield fragment.save();
        res.status(200).json(updatedFragment);
    }
    catch (error) {
        console.error("Error updating fragment:", error);
        res.status(500).json({ message: "Error updating fragment", error });
    }
});
exports.updateFragment = updateFragment;
// Eliminar un Fragment
const deleteFragment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    console.log(req.params);
    try {
        const fragment = yield FragmentsModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!fragment) {
            return res.status(404).json({ message: "Fragment not found" });
        }
        res.status(200).json({ message: "Fragment deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting fragment:", error);
        res.status(500).json({ message: "Error deleting fragment", error });
    }
});
exports.deleteFragment = deleteFragment;
const searchFragment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { term } = req.query;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const fragments = yield FragmentsModel_1.default.find({
            organizationId,
            $or: [
                { name: { $regex: term, $options: "i" } },
                { text: { $regex: term, $options: "i" } },
            ],
        });
        if (!fragments || fragments.length === 0) {
            return res.status(404).json({ message: "No fragments found" });
        }
        res.status(200).json({ fragments });
    }
    catch (error) {
        console.error("Error searching fragments:", error);
        res.status(500).json({ message: "Error searching fragments", error });
    }
});
exports.searchFragment = searchFragment;
