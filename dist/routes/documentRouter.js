"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_1 = require("../controllers/documents/documentController");
const upload_1 = __importDefault(require("../config/upload"));
const router = (0, express_1.Router)();
// Rutas para gestión de documentos
router.post("/", upload_1.default.single("file"), documentController_1.createDocument);
router.get("/", documentController_1.getAllDocuments);
router.get("/:id", documentController_1.getDocumentById);
router.put("/:id", documentController_1.updateDocument);
router.delete("/:id", documentController_1.deleteDocument);
// Rutas específicas para documentos de una organización
router.get("/organization/:organizationId", documentController_1.getDocumentsByOrganization);
exports.default = router;
