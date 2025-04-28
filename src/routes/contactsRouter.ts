import { Router } from "express";
import {
  getContacts,
  createContact,
  deleteContact,
  getContact,
  updateContact,
  searchContact,
  filterContacts,
} from "../controllers/contacts/contactsController";
import { advancedFilterContacts } from "../controllers/contacts/advancedFilter";
import { analyseContact } from "../controllers/contacts/aiAnalyser";

const router: Router = Router();

router.get("/analyse/:id", analyseContact);
router.get("/", getContacts);
router.get("/search", searchContact);
router.post("/filter", filterContacts);
router.post("/", createContact);
router.post("/advanced-filter", advancedFilterContacts);
router.delete("/", deleteContact);
router.put("/:id", updateContact);
router.get("/:id", getContact);

export default router;
