"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scoringRulesController_1 = require("../controllers/scoringRules/scoringRulesController");
const router = express_1.default.Router();
/**
 * Obtener todas las reglas de puntuación de una organización
 */
router.get("/", scoringRulesController_1.getAllScoringRules);
/**
 * Obtener una regla de puntuación específica
 */
router.get("/:id", scoringRulesController_1.getScoringRuleById);
/**
 * Crear una nueva regla de puntuación
 */
router.post("/", scoringRulesController_1.createScoringRule);
/**
 * Actualizar una regla de puntuación existente
 */
router.put("/:id", scoringRulesController_1.updateScoringRule);
/**
 * Eliminar una regla de puntuación
 */
router.delete("/:id", scoringRulesController_1.deleteScoringRule);
/**
 * Recalcular todos los puntajes de lead scoring
 */
router.post("/recalculate", scoringRulesController_1.recalculateScores);
/**
 * Recalcular puntajes de lead scoring para un contacto específico
 */
router.post("/recalculate/:contactId", scoringRulesController_1.recalculateContactScores);
/**
 * Verificar el estado de un trabajo de recalculación
 */
router.get("/recalculate/status/:jobId", scoringRulesController_1.getRecalculationStatus);
exports.default = router;
