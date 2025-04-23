import { Router } from "express";
import { createCreditNote } from "../controllers/creditNote/creditNoteController";


const router: Router = Router();

router.post("/", createCreditNote);

export default router;



