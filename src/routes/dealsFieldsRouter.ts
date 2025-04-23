import { Router } from "express";
import {
  createDealsField,
  deleteDealField,
  getDealFields,
  editDealField,
} from "../controllers/dealsFields/dealsFieldsController";

const router: Router = Router();

router.post("/create", createDealsField);
router.get("/", getDealFields);
router.delete("/delete/:id", deleteDealField);
router.put("/edit/:id", editDealField);

export default router;
