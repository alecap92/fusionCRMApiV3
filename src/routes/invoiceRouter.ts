import { Router } from "express";
import {
  getInvoice,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  searchInvoice,
  sendInvoice,
} from "../controllers/invoice/invoiceController";

const router: Router = Router();

router.get("/", getInvoices);
router.get("/search", searchInvoice); // Search for invoices based on a term
router.get("/:id", getInvoice); // Get a single invoice by ID
router.post("/", createInvoice); // Create a new invoice
router.put("/:id", updateInvoice); // Update an invoice by ID
router.delete("/:id", deleteInvoice); // Delete an invoice by ID
router.post("/send", sendInvoice); // Send an invoice by email to the client

export default router;
