"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationController_1 = require("../controllers/organizations/organizationController");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.get("/", organizationController_1.getOrganization);
router.get("/:id", organizationController_1.getOrganizationById);
router.put("/", organizationController_1.updateOrganization);
router.post("/uploadLogo", upload.single("logo"), organizationController_1.uploadLogo);
exports.default = router;
