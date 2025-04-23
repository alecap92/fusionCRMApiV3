import { Request, Response } from "express";
import File from "../../models/FileModel";
const cloudinary = require("../../config/cloudinaryConfig");

// Función auxiliar para subir archivos a Cloudinary
const uploadToCloudinary = (
  mediaBuffer: Buffer,
  resourceType: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let options: any = { resource_type: resourceType };
    console.log(resourceType);
    switch (resourceType) {
      case "image":
        console.log("filetype image");
        options.transformation = [
          { width: 800, crop: "scale" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ];
        break;
      case "video":
        options.transformation = [
          { quality: "auto" },
          { fetch_format: "auto" },
        ];
        break;
      case "raw":
        options.transformation = [
          { quality: "auto" },
          { fetch_format: "auto" },
        ];
        break;
      case "application":
        options.resource_type = "raw";
        options.format = "pdf";
        break;
      default:
        break;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(mediaBuffer);
  });
};

// Subir un archivo a Cloudinary y guardarlo en la base de datos
export const uploadFile = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const organizationId = req.user!.organizationId;
  const isVisible = req.query.isVisible;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!userId || !organizationId) {
      return res
        .status(400)
        .json({ message: "User or organization not found" });
    }

    const fileBuffer = req.file.buffer;
    const fileType = req.file.mimetype.split("/")[0];

    const mediaURL = await uploadToCloudinary(fileBuffer, fileType);

    const file = new File({
      user: userId,
      organization: organizationId,
      fileType,
      mediaURL,
      name: req.file.originalname,
      isVisible: isVisible,
    });

    await file.save();
    res.status(201).json(file);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Error al subir el archivo", error });
  }
};

// Obtener todos los archivos de una organización
export const getFiles = async (req: Request, res: Response) => {
  try {
    const isVisible = req.query.isVisible;

    if (isVisible) {
      const files = await File.find({
        organization: req.user!.organizationId,
        isVisible: isVisible,
      })

      res.status(200).json(files);
      return;
    }


    const files = await File.find({ organization: req.user!.organizationId });
    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los archivos", error });
  }
};

// Eliminar un archivo de Cloudinary y de la base de datos
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    await cloudinary.uploader.destroy(file.mediaURL, { resource_type: "auto" });

    res.status(200).json({ message: "Archivo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el archivo", error });
  }
};
