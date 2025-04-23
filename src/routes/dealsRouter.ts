import { Router } from "express";
import {
  getDeals,
  createDeal,
  changeDealStatus,
  getDealDetails,
  editDeal,
  getContactDeals,
  deleteDeal,
  searchDeals,
} from "../controllers/deals/dealsController";

const router: Router = Router();

router.get("/", getDeals);
router.get("/contact/:id", getContactDeals);
router.get("/search", searchDeals);
router.get("/:id", getDealDetails);
router.post("/", createDeal);
router.put("/status/:id", changeDealStatus);
router.put("/:id", editDeal);
router.delete("/:id", deleteDeal);

export default router;
