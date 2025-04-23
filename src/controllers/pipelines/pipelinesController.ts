import { Request, Response } from "express";
import Pipelines from "../../models/PipelinesModel";
import Status from "../../models/StatusModel";

// Crear Pipeline
export const createPipeline = async (req: Request, res: Response) => {
  try {
    const { title, states } = req.body;
    const pipelines = new Pipelines({
      title,
      organizationId: req.user?.organizationId,
    });
    await pipelines.save();
    const pipelineId = pipelines._id;

    const statesArray = states.map((state: any, index: number) => ({
      name: state.name,
      order: state.order,
      pipeline: pipelineId,
      organizationId: req.user?.organizationId,
    }));
    const newStates = await Status.insertMany(statesArray);

    res.status(200).json({
      message: "Pipeline creado con éxito",
      pipeline: pipelines,
      states: newStates,
    });
  } catch (error) {
    console.error("Error creando el pipeline:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener Pipelines
export const getPipelines = async (req: Request, res: Response) => {
  try {
    const pipelines = await Pipelines.find({
      organizationId: req.user?.organizationId,
    }).exec();
    res.status(200).json(pipelines);
  } catch (error) {
    console.error("Error obteniendo los pipelines:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener Pipeline por ID
export const getPipelineById = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipelines.findById(req.params.id).exec();
    if (!pipeline) {
      res.status(404).json({ message: "Pipeline no encontrado" });
      return;
    }
    res.status(200).json(pipeline);
  } catch (error) {
    console.error("Error obteniendo el pipeline:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar Pipeline
export const updatePipeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedPipeline = await Pipelines.findByIdAndUpdate(id, req.body, {
      new: true,
    }).exec();
    if (!updatedPipeline) {
      res.status(404).json({ message: "Pipeline no encontrado" });
      return;
    }
    res.status(200).json({ message: "Pipeline actualizado", updatedPipeline });
  } catch (error) {
    console.error("Error actualizando el pipeline:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar Pipeline
export const deletePipeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedPipeline = await Pipelines.findByIdAndDelete(id).exec();
    if (!deletedPipeline) {
      res.status(404).json({ message: "Pipeline no encontrado" });
      return;
    }
    await Status.deleteMany({ pipeline: id }).exec();
    res.status(200).json({ message: "Pipeline eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando el pipeline:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
