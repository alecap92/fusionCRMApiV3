import express from "express";
import {
  getAllScoringRules,
  getScoringRuleById,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
  recalculateScores,
  getRecalculationStatus,
  recalculateContactScores,
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

/**
 * Recalcular todos los puntajes de lead scoring
 */
router.post("/recalculate", recalculateScores);

/**
 * Recalcular puntajes de lead scoring para un contacto específico
 */
router.post("/recalculate/:contactId", recalculateContactScores);

/**
 * Verificar el estado de un trabajo de recalculación
 */
router.get("/recalculate/status/:jobId", getRecalculationStatus);

export default router;
