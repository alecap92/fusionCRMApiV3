"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analytics/analyticsController");
const router = (0, express_1.Router)();
router.get("/", analyticsController_1.getMarketingDashboard);
exports.default = router;
