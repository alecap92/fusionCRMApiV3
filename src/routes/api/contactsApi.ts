import { Router } from "express";
import {
  createContact,
  searchContactByPhone,
} from "../../controllers/api/ContactsApi";

const router: Router = Router();

// Buscar contacto por teléfono (debe ir antes de la ruta POST)
router.get("/search", searchContactByPhone);

// Crear contacto
router.post("/", createContact);

export default router;
