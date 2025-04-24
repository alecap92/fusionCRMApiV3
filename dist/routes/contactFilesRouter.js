"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactFilesController_1 = require("../controllers/contacts/contactFilesController");
const upload_1 = __importDefault(require("../config/upload"));
const router = (0, express_1.Router)();
// Rutas para gestión de documentos
router.post("/", upload_1.default.single("file"), contactFilesController_1.createContactFile);
router.delete("/:contactId/:fileId", contactFilesController_1.deleteContactFile);
exports.default = router;
