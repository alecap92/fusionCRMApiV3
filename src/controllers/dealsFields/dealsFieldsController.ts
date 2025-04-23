import { Request, Response } from "express";
import DealsFields from "../../models/DealsFieldsModel";
import DealsFieldsValues from "../../models/DealsFieldsValuesModel";
import Deals from "../../models/DealsModel";

// Crear campo de trato
export const createDealsField = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { pipeline, name, key } = req.body;

    if (!pipeline || !name || !key) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const exist = await DealsFields.findOne({ key }).exec();

    if (exist) {
      return res
        .status(400)
        .json({ message: "Ya existe un campo con esa clave" });
    }

    await DealsFields.create({ pipeline, name, key });

    return res.status(201).json({ message: "Campo creado correctamente" });
  } catch (error) {
    console.error("Error creando el campo de trato:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener campos de trato
export const getDealFields = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { pipelineId } = req.query;

    const fields = await DealsFields.find({ pipeline: pipelineId }).exec();

    return res.status(200).json(fields);
  } catch (error) {
    console.error("Error obteniendo los campos de trato:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar campo de trato
export const deleteDealField = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    await DealsFields.findByIdAndDelete(id).exec();
    await DealsFieldsValues.deleteMany({ field: id }).exec();

    return res.status(200).json({ message: "Campo eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando el campo de trato:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

// Editar campo de trato
export const editDealField = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { pipeline, name, key, required } = req.body;

    if (!pipeline || !name || !key) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    await DealsFields.findByIdAndUpdate(id, {
      pipeline,
      name,
      key,
      required,
    }).exec();

    return res.status(200).json({ message: "Campo actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando el campo de trato:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
