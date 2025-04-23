import { Router } from "express";
import {
  getScheduledPosts,
  getScheduledPost,
  createScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  retryScheduledPost,
  generateContent,
} from "../controllers/social/scheduledPostController";
import upload from "../config/upload";

const router: Router = Router();

// Obtener todas las publicaciones (filtradas por organización, fecha, estado, etc.)
router.get("/", getScheduledPosts);

// Obtener una publicación programada por ID
router.get("/:id", getScheduledPost);

// Crear una nueva publicación programada
router.post("/", upload.single("mediaFile"), createScheduledPost);

// Actualizar una publicación existente
router.patch("/:id", updateScheduledPost);

// Eliminar una publicación programada
router.delete("/:id", deleteScheduledPost);

// Reintentar una publicación fallida
router.post("/:id/retry", retryScheduledPost);

// Generar contenido por Ai
router.post("/generate", generateContent);

export default router;
