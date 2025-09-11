import { Router } from "express";
import { createContact } from "../../controllers/api/ContactsApi";

const router: Router = Router();

router.post("/", createContact);

export default router;
