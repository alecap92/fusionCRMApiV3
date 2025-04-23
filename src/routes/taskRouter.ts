import { Router } from "express";
import {
  createTask,
  getTaskById,
  getAllTasks,
  updateTask,
  deleteTask,
  searchTask,
} from "../controllers/task/taskController";

const router: Router = Router();

router.post("/", createTask); // Crear una tarea
router.get("/search", searchTask); // Buscar tareas por nombre
router.get("/:id", getTaskById); // Obtener una tarea por su ID
router.get("/", getAllTasks); // Obtener todas las tareas
router.put("/:id", updateTask); // Actualizar una tarea
router.delete("/:id", deleteTask); // Eliminar una tarea

export default router;
