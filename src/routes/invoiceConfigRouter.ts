import { Router } from "express";
import {
  getInvoiceConfig,
  createInvoiceConfig,
  updateInvoiceConfig,
  updateCompanyInfo,
  updateEmailSettings,
  updatePlaceholders,
  updateResolutionNumber,
  getNextInvoiceNumber,
  checkResolutionStatus,
  certificateConfiguration,
  createCompany,
} from "../controllers/invoice/invoiceConfigController";
import upload from "../config/upload";

const router: Router = Router();

// Rutas principales para la configuración completa
router.get("/", getInvoiceConfig);
router.put("/", updateInvoiceConfig);
router.post("/company", createCompany);
router.post("/", createInvoiceConfig);

// Rutas para actualizar secciones específicas
router.put("/company-info", updateCompanyInfo);
router.put("/email-settings", updateEmailSettings);
router.put("/placeholders", updatePlaceholders);
router.put("/resolution-number", updateResolutionNumber);

router.post(
  "/parseCertificate",
  upload.single("certificado"),
  certificateConfiguration
);

// Rutas para funcionalidades adicionales
router.get("/next-number", getNextInvoiceNumber);
router.get("/resolution-status", checkResolutionStatus);


export default router;



/*

1. 

*/