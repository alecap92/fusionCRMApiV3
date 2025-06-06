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
  getDealsStats,
  getMonthlyStats,
  getTopSellingProducts,
  createTestProductAcquisitions,
} from "../controllers/deals/dealsController";

const router: Router = Router();

// Rutas de estadísticas (deben ir antes de las rutas dinámicas)
router.get("/stats", getDealsStats);
router.get("/stats/monthly", getMonthlyStats);
router.get("/stats/top-products", getTopSellingProducts);
router.post("/test/create-product-acquisitions", createTestProductAcquisitions);

// Rutas existentes
router.get("/", getDeals);
router.get("/contact/:id", getContactDeals);
router.get("/search", searchDeals);
router.get("/:id", getDealDetails);
router.post("/", createDeal);
router.put("/status/:id", changeDealStatus);
router.put("/:id", editDeal);
router.delete("/:id", deleteDeal);

export default router;
