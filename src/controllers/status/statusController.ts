import { Request, Response } from "express";
import Deals from "../../models/DealsModel";
import StatusModel from "../../models/StatusModel";

// Crear estado
export const createStatus = async (req: Request, res: Response) => {
  try {
    const form = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const newStatus = new StatusModel({
      ...form,
      organizationId: req.user.organizationId,
    });

    const status = await newStatus.save();

    res.status(201).json(status);
  } catch (error) {
    console.error("Error creando el estado:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error desconocido" });
    }
  }
};

// Obtener estados
export const getStatus = async (req: Request, res: Response) => {
  const pipelineId = req.query.pipelineId as string;
  try {
    if (!req.user) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const status = await StatusModel.find({
      organizationId: req.user.organizationId,
      pipeline: pipelineId,
    }).exec();

    res.status(200).json(status);
  } catch (error) {
    console.error("Error creando el estado:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error desconocido" });
    }
  }
};

// Editar estado
export const editStatus = async (req: Request, res: Response) => {
  try {
    const statusId = req.params.id;
    const form = req.body;

    const status = await StatusModel.findByIdAndUpdate(statusId, form, {
      new: true,
    }).exec();

    if (!status) {
      res.status(404).json({ message: "Estado no encontrado" });
      return;
    }

    res.status(200).json(status);
  } catch (error) {
    console.error("Error creando el estado:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error desconocido" });
    }
  }
};

// Editar estados por pipeline
export const editStatusByPipeline = async (req: Request, res: Response) => {
  try {
    const pipelineId = req.params.id;
    const form = req.body;

    console.log("CASASS");

    if (!req.user) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const currentStatus = await StatusModel.find({
      organizationId: req.user.organizationId,
      pipeline: pipelineId,
    }).exec();

    await StatusModel.deleteMany({ pipeline: pipelineId }).exec();

    const statesToCreate = form.filter((status: any) => !status._id);

    await StatusModel.insertMany(
      statesToCreate.map((status: any) => ({
        ...status,
        organizationId: req.user?.organizationId,
        pipeline: pipelineId,
      }))
    );

    const statesToUpdate = form.filter((status: any) => status._id);

    const insertedStates = await StatusModel.insertMany(
      statesToUpdate.map((status: any) => ({
        ...status,
        organizationId: req.user?.organizationId,
        pipeline: pipelineId,
      }))
    );

    const insertedIds = new Set(
      insertedStates.map((state) => state._id.toString())
    );
    const currentIds = new Set(
      currentStatus.map((state) => state._id?.toString())
    );

    const removedIds = [...currentIds].filter((id) => !insertedIds.has(id));

    await Deals.updateMany(
      { status: { $in: removedIds } },
      { status: insertedStates[0]._id.toString() }
    ).exec();

    res.status(200).json({ message: "Estados actualizados correctamente" });
  } catch (error) {
    console.error("Error creando el estado:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error desconocido" });
    }
  }
};
