import { Router } from "express";
import {createContactFile, deleteContactFile} from "../controllers/contacts/contactFilesController";
import upload from "../config/upload";


const router = Router();



// Rutas para gestión de documentos
router.post("/", upload.single("file"), createContactFile);
router.delete("/:contactId/:fileId", deleteContactFile);

export default router;
