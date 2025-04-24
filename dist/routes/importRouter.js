"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const importController_1 = require("../controllers/import/importController");
const importDeals_1 = require("../controllers/import/importDeals");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});
router.post("/contacts", upload.single("file"), importController_1.importContacts);
router.post("/deals", upload.single("file"), importDeals_1.importDeals);
exports.default = router;
