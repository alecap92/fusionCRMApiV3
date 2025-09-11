import { Router } from "express";
import { requireApiPermission } from "../../middlewares/authApiMiddleware";
import { createQuotationApi } from "../../controllers/quotations/quotationController";
import { API_PERMISSIONS } from "../../types/apiTypes";

const router: Router = Router();

// Crear cotización - requiere permiso de escritura
router.post(
  "/",
  requireApiPermission(API_PERMISSIONS.QUOTATIONS_WRITE),
  createQuotationApi
);

export default router;
