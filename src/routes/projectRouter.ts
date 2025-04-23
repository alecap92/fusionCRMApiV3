import { Router } from "express";
import {
  createProject,
  getProjectById,
  getAllProjects,
  updateProject,
  deleteProject,
  searchProject,
} from "../controllers/projects/projectController";

const router: Router = Router();

router.post("/", createProject); // Crear un proyecto
router.get("/search", searchProject); // Buscar proyectos por nombre
router.get("/", getAllProjects); // Obtener todos los proyectos
router.get("/:id", getProjectById); // Obtener un proyecto por su ID
router.put("/:id", updateProject); // Actualizar un proyecto
router.delete("/:id", deleteProject); // Eliminar un proyecto

export default router;
