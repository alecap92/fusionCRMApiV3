"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leadsGenerationController_1 = require("../controllers/leadsGeneration/leadsGenerationController");
const router = (0, express_1.Router)();
router.get("/google-maps", leadsGenerationController_1.getGoogleMaps);
exports.default = router;
