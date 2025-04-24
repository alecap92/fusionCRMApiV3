"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const formController_1 = require("../controllers/forms/formController");
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)();
router.get("/", authMiddleware_1.verifyToken, formController_1.getForms);
router.get("/:formId", authMiddleware_1.verifyToken, formController_1.getForm);
router.post("/create", authMiddleware_1.verifyToken, formController_1.createForm);
router.post("/submit/:formId", upload.none(), formController_1.submitFormResponse);
router.delete("/form-responses", authMiddleware_1.verifyToken, formController_1.deleteFormResponses);
router.delete("/:formId", authMiddleware_1.verifyToken, formController_1.deleteForm);
exports.default = router;
