import { Request, Response } from "express";
import Organization from "../../models/OrganizationModel";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
const cloudinary = require("../../config/cloudinaryConfig");

// Obtener todas las organizaciones
export const getOrganization = async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find().exec();
    res.status(200).json({ organizations });
  } catch (error) {
    console.error("Error obteniendo las organizaciones:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Crear una organización
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const organization = new Organization(req.body);
    await organization.save();
    res
      .status(201)
      .json({ message: "Organización creada correctamente", organization });
  } catch (error) {
    console.error("Error creando la organización:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener una organización por ID
export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const organization = await Organization.findById(organizationId)
      .populate("employees")
      .exec();

    if (!organization) {
      res.status(404).json({ message: "Organización no encontrada" });
      return;
    }
    res.status(200).json(organization);
  } catch (error) {
    console.error("Error obteniendo la organización:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar una organización
export const updateOrganization = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  console.log(req.body);

  try {
    const updatedOrganization = await Organization.findByIdAndUpdate(
      organizationId,
      req.body,
      { new: true }
    );

    if (!updatedOrganization) {
      res.status(404).json({ message: "Organización no encontrada" });
      return;
    }
    res
      .status(200)
      .json({ message: "Organización actualizada", updatedOrganization });
  } catch (error) {
    console.error("Error actualizando la organización:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar una organización
export const deleteOrganization = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedOrganization = await Organization.findByIdAndDelete(id).exec();
    if (!deletedOrganization) {
      res.status(404).json({ message: "Organización no encontrada" });
      return;
    }
    res.status(200).json({ message: "Organización eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando la organización:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Buscar organizaciones
export const searchOrganization = async (req: Request, res: Response) => {
  const { query } = req.query;
  try {
    const organizations = await Organization.find({
      name: { $regex: query, $options: "i" },
    }).exec();
    res.status(200).json(organizations);
  } catch (error) {
    console.error("Error buscando organizaciones:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const uploadLogo = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(400)
        .json({ error: "No se proporcionó el ID de la organización" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No se proporcionó un archivo para subir" });
    }

    // Subir el archivo a Cloudinary usando el buffer
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "organization_logos" },
        (
          error: UploadApiErrorResponse | null,
          result: UploadApiResponse | undefined
        ) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(req.file?.buffer);
    });

    const updatedOrganization = await Organization.findByIdAndUpdate(
      { _id: organizationId },
      { logoUrl: result.secure_url },
      { new: true }
    );

    return res.status(200).json({
      message: "Logo actualizado con éxito",
      logoUrl: result.secure_url,
      organization: updatedOrganization,
    });
  } catch (error) {
    console.error("Error al subir el logo:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const uploadIcon = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(400)
        .json({ error: "No se proporcionó el ID de la organización" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No se proporcionó un archivo para subir" });
    }

    // Subir el archivo a Cloudinary usando el buffer
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "organization_icons" },
        (
          error: UploadApiErrorResponse | null,
          result: UploadApiResponse | undefined
        ) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(req.file?.buffer);
    });

    const updatedOrganization = await Organization.findByIdAndUpdate(
      { _id: organizationId },
      { iconUrl: result.secure_url },
      { new: true }
    );

    return res.status(200).json({
      message: "Icono actualizado con éxito",
      iconUrl: result.secure_url,
      organization: updatedOrganization,
    });
  } catch (error) {
    console.error("Error al subir el icono:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
