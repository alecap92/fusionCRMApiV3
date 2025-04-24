"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fragmentController_1 = require("../controllers/fragments/fragmentController");
const router = (0, express_1.Router)();
// Crear un nuevo Fragment
router.post("/", fragmentController_1.createFragment);
// Obtener todos los Fragments
router.get("/", fragmentController_1.getFragments);
router.get("/search", fragmentController_1.searchFragment);
// Obtener un Fragment por ID
router.get("/:id", fragmentController_1.getFragmentById);
// Actualizar un Fragment
router.put("/:id", fragmentController_1.updateFragment);
// Eliminar un Fragment
router.delete("/:id", fragmentController_1.deleteFragment);
exports.default = router;
