import express from "express";
import {
  getAllScoringRules,
  getScoringRuleById,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
} from "../controllers/scoringRules/scoringRulesController";

const router = express.Router();

/**
 * Obtener todas las reglas de puntuación de una organización
 */
router.get("/", getAllScoringRules);

/**
 * Obtener una regla de puntuación específica
 */
router.get("/:id", getScoringRuleById);

/**
 * Crear una nueva regla de puntuación
 */
router.post("/", createScoringRule);

/**
 * Actualizar una regla de puntuación existente
 */
router.put("/:id", updateScoringRule);

/**
 * Eliminar una regla de puntuación
 */
router.delete("/:id", deleteScoringRule);

export default router;
