"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealsController_1 = require("../controllers/deals/dealsController");
const router = (0, express_1.Router)();
// Rutas de estadísticas (deben ir antes de las rutas dinámicas)
router.get("/stats", dealsController_1.getDealsStats);
router.get("/stats/monthly", dealsController_1.getMonthlyStats);
router.get("/stats/top-products", dealsController_1.getTopSellingProducts);
router.post("/test/create-product-acquisitions", dealsController_1.createTestProductAcquisitions);
// Rutas existentes
router.get("/", dealsController_1.getDeals);
router.get("/contact/:id", dealsController_1.getContactDeals);
router.get("/search", dealsController_1.searchDeals);
router.get("/:id", dealsController_1.getDealDetails);
router.post("/", dealsController_1.createDeal);
router.put("/status/:id", dealsController_1.changeDealStatus);
router.put("/:id", dealsController_1.editDeal);
router.delete("/:id", dealsController_1.deleteDeal);
exports.default = router;
