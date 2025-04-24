"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DealsApi_1 = require("../controllers/api/DealsApi");
const router = (0, express_1.Router)();
router.post("/", DealsApi_1.createDeal);
exports.default = router;
