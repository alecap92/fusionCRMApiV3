"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailTemplatesController_1 = require("../controllers/emailTemplates/emailTemplatesController");
const router = (0, express_1.Router)();
router.post("/", emailTemplatesController_1.createEmailTemplate); // Create an email template
router.get("/", emailTemplatesController_1.getEmailTemplates); // Get all email templates
router.get("/:id", emailTemplatesController_1.getEmailTemplateById); // Get an email template by ID
router.put("/:id", emailTemplatesController_1.updateEmailTemplate); // Update an email template by ID
router.delete("/:id", emailTemplatesController_1.deleteEmailTemplate); // Delete an email template by ID
exports.default = router;
