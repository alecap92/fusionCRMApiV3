import { Request, Response } from "express";
import Fragment from "../../models/FragmentsModel";

// Crear un nuevo Fragment
export const createFragment = async (req: Request, res: Response) => {
  const { name, text, atajo } = req.body;
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  try {
    const newFragment = new Fragment({
      name,
      text,
      atajo,
      userId,
      organizationId,
    });

    const savedFragment = await newFragment.save();
    res.status(201).json(savedFragment);
  } catch (error) {
    console.error("Error creating fragment:", error);
    res.status(500).json({ message: "Error creating fragment", error });
  }
};

// Obtener todos los Fragments
export const getFragments = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;
  const limit = Number(req.query.limit) || 5;
  const page = Number(req.query.page) || 1;
  const skip = (Number(req.query.page) - 1) * limit || 0;

  if (!organizationId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const fragments = await Fragment.find({
      organizationId,
    })
      .limit(limit)
      .skip(skip);

    const totalFragments = await Fragment.countDocuments({
      organizationId,
    });

    res.status(200).json({
      fragments,
      totalPages: Math.ceil(totalFragments / limit),
      currentPage: page,
      totalFragments,
    } as any);
  } catch (error) {
    console.error("Error retrieving fragments:", error);
    res.status(500).json({ message: "Error retrieving fragments", error });
  }
};

// Obtener un Fragment por ID
export const getFragmentById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const fragment = await Fragment.findById(id);

    if (!fragment) {
      return res.status(404).json({ message: "Fragment not found" });
    }

    res.status(200).json(fragment);
  } catch (error) {
    console.error("Error retrieving fragment:", error);
    res.status(500).json({ message: "Error retrieving fragment", error });
  }
};

// Actualizar un Fragment
export const updateFragment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, text, atajo } = req.body;

  try {
    const fragment = await Fragment.findById(id);

    if (!fragment) {
      return res.status(404).json({ message: "Fragment not found" });
    }

    fragment.name = name || fragment.name;
    fragment.text = text || fragment.text;
    fragment.atajo = atajo || fragment.atajo;

    const updatedFragment = await fragment.save();
    res.status(200).json(updatedFragment);
  } catch (error) {
    console.error("Error updating fragment:", error);
    res.status(500).json({ message: "Error updating fragment", error });
  }
};

// Eliminar un Fragment
export const deleteFragment = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { id } = req.params;
  console.log(req.params);
  try {
    const fragment = await Fragment.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!fragment) {
      return res.status(404).json({ message: "Fragment not found" });
    }

    res.status(200).json({ message: "Fragment deleted successfully" });
  } catch (error) {
    console.error("Error deleting fragment:", error);
    res.status(500).json({ message: "Error deleting fragment", error });
  }
};

export const searchFragment = async (req: Request, res: Response) => {
  const { term } = req.query;

  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const fragments = await Fragment.find({
      organizationId,
      $or: [
        { name: { $regex: term, $options: "i" } },
        { text: { $regex: term, $options: "i" } },
      ],
    });

    if (!fragments || fragments.length === 0) {
      return res.status(404).json({ message: "No fragments found" });
    }

    res.status(200).json({ fragments });
  } catch (error) {
    console.error("Error searching fragments:", error);
    res.status(500).json({ message: "Error searching fragments", error });
  }
};
