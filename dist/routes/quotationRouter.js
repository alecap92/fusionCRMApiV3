"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotationController_1 = require("../controllers/quotations/quotationController");
const router = (0, express_1.Router)();
router.get("/search", quotationController_1.searchQuotation); // Search for quotations based on a term
router.get("/print/:id", quotationController_1.printQuotation);
router.get("/:id", quotationController_1.getQuotation); // Get a single quotation by ID
router.get("/", quotationController_1.getQuotations); // Get all quotations
router.post("/send-email", quotationController_1.sendQuotationEmail); // Send a quotation email by ID
router.post("/", quotationController_1.createQuotation); // Create a new quotation
router.post("/advanced-filter", quotationController_1.advancedFilterQuotations); // Advanced filter for quotations
router.put("/:id", quotationController_1.updateQuotation); // Update a quotation by ID
router.delete("/:id", quotationController_1.deleteQuotation); // Delete a quotation by ID
exports.default = router;
