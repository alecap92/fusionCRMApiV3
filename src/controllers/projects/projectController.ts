import { Request, Response } from "express";
import Project from "../../models/ProjectModel";
import TaskModel from "../../models/TaskModel";

// Crear un nuevo proyecto
export const createProject = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { name, description, startDate, endDate, budget } = req.body;

    const organizationId = req.user?.organizationId;
    const ownerId = req.user?._id;

    console.log(organizationId, ownerId);

    if (!organizationId || !ownerId) {
      return res.status(400).json({ message: "Usuario no autorizado" });
    }

    if (!name) {
      return res
        .status(400)
        .json({ message: "El nombre del proyecto es requerido" });
    }

    const newProject = new Project({
      name,
      description,
      startDate,
      endDate,
      budget,
      organizationId,
      ownerId,
    });

    const savedProject = await newProject.save();
    return res.status(201).json(savedProject);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error al crear el proyecto", error });
  }
};

// Obtener un proyecto por su ID
export const getProjectById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    const tasks = await TaskModel.find({ projectId: id }).populate(
      "responsibleId"
    );

    return res.status(200).json({ project, tasks });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el proyecto", error });
  }
};

// Obtener todos los proyectos
export const getAllProjects = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const projects = await Project.find();
    return res.status(200).json(projects);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los proyectos", error });
  }
};

export const searchProject = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { q } = req.query;
    console.log(req.query);
    const projects = await Project.find({
      name: { $regex: q, $options: "i" },
      organizationId: req.user?.organizationId,
    });

    if (!projects) {
      return res.status(404).json({ message: "Proyectos no encontrados" });
    }

    return res.status(200).json(projects);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al buscar proyectos", error });
  }
};

// Actualizar un proyecto por su ID
export const updateProject = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const updatedProject = await Project.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedProject) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    return res.status(200).json(updatedProject);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el proyecto", error });
  }
};

// Eliminar un proyecto por su ID
export const deleteProject = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const deletedProject = await Project.findByIdAndDelete(id);

    // delete all tasks related to the project

    await TaskModel.deleteMany({ projectId: id });

    if (!deletedProject) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    return res.status(200).json({ message: "Proyecto eliminado exitosamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el proyecto", error });
  }
};
