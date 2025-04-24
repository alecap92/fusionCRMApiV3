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
exports.deleteCampaign = exports.updateCampaign = exports.getCampaignById = exports.getCampaings = exports.createCampaign = void 0;
const EmailMarketingModel_1 = __importDefault(require("../../models/EmailMarketingModel"));
// ✅ Crear una nueva campaña
const createCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const createdBy = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const { name, description, emailTemplateId, recipients, scheduledAt } = req.body;
        console.log(req.body);
        if (!name || !emailTemplateId || !recipients) {
            return res.status(400).json({
                message: "Name, emailTemplateId, and recipients are required fields.",
            });
        }
        const newCampaign = new EmailMarketingModel_1.default({
            name,
            description,
            emailTemplateId,
            recipients,
            scheduledAt,
            organizationId,
            userId: createdBy,
            createdAt: new Date(),
            status: "draft", // Default status is draft
        });
        yield newCampaign.save();
        res.status(201).json({
            message: "Campaign created successfully",
            campaign: newCampaign,
        });
    }
    catch (error) {
        console.error("Error creating campaign:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.createCampaign = createCampaign;
// ✅ Obtener todas las campañas de la organización con paginación
const getCampaings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const campaings = yield EmailMarketingModel_1.default.find({ organizationId })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("userId");
        console.log(campaings);
        const total = yield EmailMarketingModel_1.default.countDocuments({ organizationId });
        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            campaings,
        });
    }
    catch (error) {
        console.error("Error fetching campaings:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getCampaings = getCampaings;
// ✅ Obtener una campaña por ID
const getCampaignById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const campaign = yield EmailMarketingModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(campaign);
    }
    catch (error) {
        console.error("Error fetching campaign:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getCampaignById = getCampaignById;
// ✅ Actualizar una campaña
const updateCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const { name, description, emailTemplateId, recipients, scheduledAt, status, } = req.body;
        const existingCampaign = yield EmailMarketingModel_1.default.findOne({
            _id: id,
            organizationId,
        });
        if (!existingCampaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        existingCampaign.name = name !== null && name !== void 0 ? name : existingCampaign.name;
        existingCampaign.description = description !== null && description !== void 0 ? description : existingCampaign.description;
        existingCampaign.emailTemplateId =
            emailTemplateId !== null && emailTemplateId !== void 0 ? emailTemplateId : existingCampaign.emailTemplateId;
        existingCampaign.recipients = recipients !== null && recipients !== void 0 ? recipients : existingCampaign.recipients;
        existingCampaign.scheduledAt = scheduledAt !== null && scheduledAt !== void 0 ? scheduledAt : existingCampaign.scheduledAt;
        existingCampaign.status = status !== null && status !== void 0 ? status : existingCampaign.status;
        yield existingCampaign.save();
        res.status(200).json({
            message: "Campaign updated successfully",
            campaign: existingCampaign,
        });
    }
    catch (error) {
        console.error("Error updating campaign:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.updateCampaign = updateCampaign;
// ✅ Eliminar una campaña
const deleteCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const deletedCampaign = yield EmailMarketingModel_1.default.findOneAndDelete({
            _id: id,
            organizationId,
        });
        if (!deletedCampaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json({ message: "Campaign deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting campaign:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.deleteCampaign = deleteCampaign;
