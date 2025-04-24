"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoiceController_1 = require("../controllers/invoice/invoiceController");
const router = (0, express_1.Router)();
router.get("/", invoiceController_1.getInvoices);
router.get("/search", invoiceController_1.searchInvoice); // Search for invoices based on a term
router.get("/:id", invoiceController_1.getInvoice); // Get a single invoice by ID
router.post("/", invoiceController_1.createInvoice); // Create a new invoice
router.put("/:id", invoiceController_1.updateInvoice); // Update an invoice by ID
router.delete("/:id", invoiceController_1.deleteInvoice); // Delete an invoice by ID
router.post("/send", invoiceController_1.sendInvoice); // Send an invoice by email to the client
exports.default = router;
