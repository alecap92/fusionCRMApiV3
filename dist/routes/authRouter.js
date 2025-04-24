"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/auth/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Endpoint para iniciar sesión
router.post("/login", authController_1.login);
router.post("/register", authController_1.register);
router.post("/verify-token", authMiddleware_1.verifyToken, authController_1.verifyToken);
router.post("/refresh", authMiddleware_1.verifyToken, authController_1.refreshToken); // Añadir este endpoint
exports.default = router;
