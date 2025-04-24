"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DownloadDeals_1 = require("../controllers/api/DownloadDeals");
const router = (0, express_1.Router)();
router.get("/", DownloadDeals_1.downloadDeals);
exports.default = router;
