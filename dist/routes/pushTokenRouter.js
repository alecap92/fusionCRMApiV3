"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pushTokenController_1 = require("../controllers/pushTokenController");
const router = (0, express_1.Router)();
router.post("/", pushTokenController_1.createPushToken);
router.delete("/", pushTokenController_1.deletePushToken);
exports.default = router;
