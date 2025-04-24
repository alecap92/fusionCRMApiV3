"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskController_1 = require("../controllers/task/taskController");
const router = (0, express_1.Router)();
router.post("/", taskController_1.createTask); // Crear una tarea
router.get("/search", taskController_1.searchTask); // Buscar tareas por nombre
router.get("/:id", taskController_1.getTaskById); // Obtener una tarea por su ID
router.get("/", taskController_1.getAllTasks); // Obtener todas las tareas
router.put("/:id", taskController_1.updateTask); // Actualizar una tarea
router.delete("/:id", taskController_1.deleteTask); // Eliminar una tarea
exports.default = router;
