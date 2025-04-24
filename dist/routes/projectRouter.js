"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projects/projectController");
const router = (0, express_1.Router)();
router.post("/", projectController_1.createProject); // Crear un proyecto
router.get("/search", projectController_1.searchProject); // Buscar proyectos por nombre
router.get("/", projectController_1.getAllProjects); // Obtener todos los proyectos
router.get("/:id", projectController_1.getProjectById); // Obtener un proyecto por su ID
router.put("/:id", projectController_1.updateProject); // Actualizar un proyecto
router.delete("/:id", projectController_1.deleteProject); // Eliminar un proyecto
exports.default = router;
