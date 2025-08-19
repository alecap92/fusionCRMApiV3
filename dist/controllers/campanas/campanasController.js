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
exports.createCampana = exports.deleteCampana = exports.updateCampana = exports.getCampana = exports.getCampanas = void 0;
const CampanaModel_1 = __importDefault(require("../../models/CampanaModel"));
// Helper to send uniform error response
const handleError = (res, error, message = "Server error") => {
    return res.status(500).json({ message, error: error.message || error });
};
const getCampanas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        return res.status(400).json({ message: "organizationId is required" });
    }
    try {
        const campanas = yield CampanaModel_1.default.find({ organizationId });
        if (!campanas.length) {
            return res.status(404).json({ message: "No campaigns found" });
        }
        res.status(200).json(campanas);
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.getCampanas = getCampanas;
const getCampana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { organizationId } = req.body;
    if (!id || !organizationId) {
        return res
            .status(400)
            .json({ message: "id and organizationId are required" });
    }
    try {
        const campana = yield CampanaModel_1.default.findOne({ _id: id, organizationId });
        if (!campana) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(campana);
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.getCampana = getCampana;
const updateCampana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { organizationId } = req.body;
    if (!id || !organizationId) {
        return res
            .status(400)
            .json({ message: "id and organizationId are required" });
    }
    try {
        const updatedCampana = yield CampanaModel_1.default.findOneAndUpdate({ _id: id, organizationId }, req.body, { new: true });
        if (!updatedCampana) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(updatedCampana);
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.updateCampana = updateCampana;
const deleteCampana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { organizationId } = req.body;
    if (!id || !organizationId) {
        return res
            .status(400)
            .json({ message: "id and organizationId are required" });
    }
    try {
        const deletedCampana = yield CampanaModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!deletedCampana) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json({ message: "Campaign deleted successfully" });
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.deleteCampana = deleteCampana;
const createCampana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const campana = req.body;
    const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    if (!organizationId) {
        return res.status(400).json({ message: "organizationId is required" });
    }
    try {
        const newCampana = new CampanaModel_1.default(Object.assign(Object.assign({}, campana), { organizationId, createdBy: userId }));
        yield newCampana.save();
        res.status(201).json(newCampana);
    }
    catch (error) {
        handleError(res, error);
    }
});
exports.createCampana = createCampana;
