import { Router } from "express";
import {
  getQuotation,
  getQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  searchQuotation,
  advancedFilterQuotations,
  printQuotation,
  sendQuotationEmail,
} from "../controllers/quotations/quotationController";

const router: Router = Router();

router.get("/search", searchQuotation); // Search for quotations based on a term
router.get("/print/:id", printQuotation);
router.get("/:id", getQuotation); // Get a single quotation by ID
router.get("/", getQuotations); // Get all quotations
router.post("/send-email", sendQuotationEmail); // Send a quotation email by ID
router.post("/", createQuotation); // Create a new quotation
router.post("/advanced-filter", advancedFilterQuotations); // Advanced filter for quotations
router.put("/:id", updateQuotation); // Update a quotation by ID
router.delete("/:id", deleteQuotation); // Delete a quotation by ID

export default router;
