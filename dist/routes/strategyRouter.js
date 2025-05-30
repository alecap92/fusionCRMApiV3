"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const strategyController_1 = require("../controllers/strategy/strategyController");
const router = express_1.default.Router();
// Rutas para manejar estrategias
router.get("/", strategyController_1.getStrategies);
router.get("/:id", strategyController_1.getStrategy);
router.post("/", strategyController_1.createStrategy);
router.put("/:id", strategyController_1.updateStrategy);
router.delete("/:id", strategyController_1.deleteStrategy);
exports.default = router;
