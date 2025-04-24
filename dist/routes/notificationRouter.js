"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notifications/notificationController");
const router = (0, express_1.Router)();
router.get("/", notificationController_1.getNotifications);
router.post("/reset", notificationController_1.resetNotifications);
exports.default = router;
