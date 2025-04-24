"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdvancedSearch_1 = require("../controllers/advancedSearch/AdvancedSearch");
const router = (0, express_1.Router)();
router.post("/", AdvancedSearch_1.advancedSearch);
exports.default = router;
