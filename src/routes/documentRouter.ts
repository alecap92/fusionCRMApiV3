import { Router } from "express";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentsByOrganization
} from "../controllers/documents/documentController";
import upload from "../config/upload";


const router = Router();



// Rutas para gestión de documentos
router.post("/", upload.single("file"), createDocument);
router.get("/", getAllDocuments);
router.get("/:id", getDocumentById);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);

// Rutas específicas para documentos de una organización
router.get("/organization/:organizationId", getDocumentsByOrganization);

export default router;
