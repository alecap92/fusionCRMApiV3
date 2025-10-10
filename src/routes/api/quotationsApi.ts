import { Router } from "express";
import { requireApiPermission } from "../../middlewares/authApiMiddleware";
import {
  createQuotationApi,
  downloadQuotationApi,
} from "../../controllers/api/QuotationsApi";
import { API_PERMISSIONS } from "../../types/apiTypes";

const router: Router = Router();

// Crear cotización - requiere permiso de escritura
router.post(
  "/",
  requireApiPermission(API_PERMISSIONS.QUOTATIONS_WRITE),
  createQuotationApi
);

// Descargar cotización - requiere permiso de lectura
router.get("/:number/download", downloadQuotationApi);

export default router;
