import { Request, Response } from "express";
import Activity, { IActivity } from "../../models/ActivityModel";

// Crear actividad
export const createActivity = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    const form = {
      activityType: req.body.activityType,
      title: req.body.title,
      date: req.body.date,
      notes: req.body.notes,
      status: req.body.status,
      organizationId: organizationId,
      ownerId: req.user?._id,
      contactId: req.body.contactId,
      reminder: req.body.reminder,
    }

    const newActivity = new Activity<any>(form);

    const savedActivity = await newActivity.save();
    res.status(201).json(savedActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la actividad" });
  }
};

// Obtener actividades
export const getActivities = async (req: Request, res: Response) => {
  try {
    const activities = await Activity.find({
      contactId: req.params.contactId,
    })
      .populate("contactId")
      .populate("ownerId")
      .populate("organizationId")
      .sort({
        createdAt: "desc",
      });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las actividades" });
  }
};

// Obtener actividad por ID
export const getActivity = async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
    });

    if (!activity) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }
    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener la actividad" });
  }
};

// Actualizar actividad
export const updateActivity = async (req: Request, res: Response) => {
  try {
    const updatedActivity = await Activity.findOneAndUpdate(
      { _id: req.body._id },
      { $set: req.body },
      { new: true }
    );
    if (!updatedActivity) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }
    res.json(updatedActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la actividad" });
  }
};

// Eliminar actividad
export const deleteActivity = async (req: Request, res: Response) => {
  try {

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ message: "No tienes permisos para eliminar esta actividad" });
    }

    const deletedActivity = await Activity.findOneAndDelete({
      _id: req.params.id,
      organizationId: organizationId,
    });
   
    if (!deletedActivity) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }
    res.json({ message: "Actividad eliminada con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la actividad" });
  }
};
