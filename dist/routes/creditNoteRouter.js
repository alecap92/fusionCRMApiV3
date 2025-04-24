"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const creditNoteController_1 = require("../controllers/creditNote/creditNoteController");
const router = (0, express_1.Router)();
router.post("/", creditNoteController_1.createCreditNote);
exports.default = router;
