import { Request, Response } from "express";
import Task from "../../models/TaskModel";

// Crear una nueva tarea
export const createTask = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      title,
      status,
      dueDate,
      timeline,
      budget,
      notes,
      priority,
      projectId,
      responsibleId,
      description,
    } = req.body;

    const organizationId = req.user?.organizationId;
    const userId = req.user?._id;

    const newTask = new Task({
      title,
      status,
      dueDate,
      timeline,
      budget,
      notes,
      priority,
      projectId,
      responsibleId,
      organizationId,
      ownerId: userId,
      description,
    });

    const savedTask = await newTask.save();
    return res.status(201).json(savedTask);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error al crear la tarea", error });
  }
};

// Obtener una tarea por su ID
export const getTaskById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const task = await Task.find({
      _id: id,
      organizationId: organizationId,
    });

    if (!task) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    return res.status(200).json(task);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener la tarea", error });
  }
};

// Obtener todas las tareas
export const getAllTasks = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const organizationId = req.user?.organizationId;

    const tasks = await Task.find({
      organizationId: organizationId,
    });
    return res.status(200).json(tasks);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las tareas", error });
  }
};

export const searchTask = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log(req.query);
  try {
    const title = req.query.q;
    const tasks = await Task.find({
      title: { $regex: title, $options: "i" },
      organizationId: req.user?.organizationId,
    });

    console.log(tasks);

    return res.status(200).json(tasks);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al buscar las tareas", error });
  }
};

// Actualizar una tarea por su ID
export const updateTask = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    return res.status(200).json(updatedTask);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar la tarea", error });
  }
};

// Eliminar una tarea por su ID
export const deleteTask = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    return res.status(200).json({ message: "Tarea eliminada exitosamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar la tarea", error });
  }
};
