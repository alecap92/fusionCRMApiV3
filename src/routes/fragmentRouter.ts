import { Router } from "express";
import {
  createFragment,
  getFragments,
  getFragmentById,
  updateFragment,
  deleteFragment,
  searchFragment,
} from "../controllers/fragments/fragmentController";

const router = Router();

// Crear un nuevo Fragment
router.post("/", createFragment);

// Obtener todos los Fragments
router.get("/", getFragments);
router.get("/search", searchFragment);

// Obtener un Fragment por ID
router.get("/:id", getFragmentById);

// Actualizar un Fragment
router.put("/:id", updateFragment);

// Eliminar un Fragment
router.delete("/:id", deleteFragment);

export default router;
