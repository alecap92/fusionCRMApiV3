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

const router: Router = Router();

router.get("/", getContacts);
router.get("/search", searchContact);
router.post("/filter", filterContacts);
router.post("/", createContact);
router.post("/advanced-filter", advancedFilterContacts);
router.delete("/", deleteContact);
router.put("/:id", updateContact);
router.get("/:id", getContact);

export default router;
