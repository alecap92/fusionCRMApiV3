"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socialAccountController_1 = require("../controllers/social/socialAccountController");
const router = (0, express_1.Router)();
// Obtener todas las cuentas conectadas
router.get("/", socialAccountController_1.getSocialAccounts);
router.get("/me", socialAccountController_1.getMe);
router.get("/instagram", socialAccountController_1.getInstagramAccounts);
// Callback
router.get("/callback", socialAccountController_1.callbackSocialAccount);
// Obtener una cuenta específica
router.get("/:id", socialAccountController_1.getSocialAccount);
// Conectar o registrar una nueva cuenta
router.post("/", socialAccountController_1.createSocialAccount);
// Actualizar datos de una cuenta
router.patch("/:id", socialAccountController_1.updateSocialAccount);
// Eliminar una cuenta social
router.delete("/:id", socialAccountController_1.deleteSocialAccount);
exports.default = router;
