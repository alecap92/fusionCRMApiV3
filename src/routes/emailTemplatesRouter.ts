import { Router } from "express";
import {
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../controllers/emailTemplates/emailTemplatesController";

const router: Router = Router();

router.post("/", createEmailTemplate); // Create an email template
router.get("/", getEmailTemplates); // Get all email templates
router.get("/:id", getEmailTemplateById); // Get an email template by ID
router.put("/:id", updateEmailTemplate); // Update an email template by ID
router.delete("/:id", deleteEmailTemplate); // Delete an email template by ID

export default router;
