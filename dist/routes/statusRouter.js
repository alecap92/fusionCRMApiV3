"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statusController_1 = require("../controllers/status/statusController");
const router = (0, express_1.Router)();
router.get("/", statusController_1.getStatus);
router.post("/", statusController_1.createStatus);
router.put("/:id", statusController_1.editStatus);
router.delete("/:id", statusController_1.deleteStatus);
router.get("/:id/deals-count", statusController_1.getStatusDealsCount);
router.put("/pipeline/:id", statusController_1.editStatusByPipeline);
exports.default = router;
