"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scheduledPostController_1 = require("../controllers/social/scheduledPostController");
const upload_1 = __importDefault(require("../config/upload"));
const router = (0, express_1.Router)();
// Obtener todas las publicaciones (filtradas por organización, fecha, estado, etc.)
router.get("/", scheduledPostController_1.getScheduledPosts);
// Obtener una publicación programada por ID
router.get("/:id", scheduledPostController_1.getScheduledPost);
// Crear una nueva publicación programada
router.post("/", upload_1.default.single("mediaFile"), scheduledPostController_1.createScheduledPost);
// Actualizar una publicación existente
router.patch("/:id", scheduledPostController_1.updateScheduledPost);
// Eliminar una publicación programada
router.delete("/:id", scheduledPostController_1.deleteScheduledPost);
// Reintentar una publicación fallida
router.post("/:id/retry", scheduledPostController_1.retryScheduledPost);
// Generar contenido por Ai
router.post("/generate", scheduledPostController_1.generateContent);
exports.default = router;
