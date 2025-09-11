"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const apiTokenController_1 = require("../../controllers/api/apiTokenController");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación con token de usuario (no API)
router.use(authMiddleware_1.verifyToken);
// Obtener permisos disponibles
router.get("/permissions", apiTokenController_1.getApiPermissions);
// Listar tokens de API del usuario
router.get("/", apiTokenController_1.listApiTokens);
// Crear nuevo token de API
router.post("/", apiTokenController_1.createApiToken);
// Revocar token de API
router.delete("/:tokenId", apiTokenController_1.revokeApiToken);
// Renovar token de API
router.put("/:tokenId/renew", apiTokenController_1.renewApiToken);
exports.default = router;
