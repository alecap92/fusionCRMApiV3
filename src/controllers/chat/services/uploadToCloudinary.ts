// utils/uploadToCloudinary.ts

import { v2 as cloudinary } from "cloudinary";

export const uploadToCloudinary = (
  mediaBuffer: Buffer,
  resourceType: string,
  originalFilename?: string
): Promise<{
  url: string;
  mediaId: string;
  originalFilename: string;
  mimeType: string;
}> => {
  return new Promise((resolve, reject) => {
    let options: any = {
      resource_type: resourceType,
    };

    if (originalFilename) {
      options.use_filename = true;
      options.unique_filename = false;
      options.filename_override = originalFilename; // Usar el nombre original del archivo
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error: any, result: any) => {
        if (error) {
          console.error("Error uploading to Cloudinary:", error);
          reject(error);
        } else {
          console.log("Upload successful:", result);
          const mediaId = result.public_id;
          const url = generateMediaUrl(
            result.public_id,
            resourceType,
            originalFilename
          );
          const originalFilenameResult = result.original_filename;
          const mimeType = result.format;
          resolve({
            url,
            mediaId,
            originalFilename: originalFilenameResult,
            mimeType,
          });
        }
      }
    );

    uploadStream.end(mediaBuffer);
  });
};

// Nueva función para generar la URL sin el flag 'attachment' para PDFs
const generateMediaUrl = (
  publicId: string,
  resourceType: string,
  originalFilename?: string
): string => {
  let urlOptions: any = {
    secure: true,
    resource_type: resourceType,
  };

  // Si el recurso es un documento PDF, no agregar 'fl_attachment'
  if (
    resourceType === "raw" &&
    originalFilename?.toLowerCase().endsWith(".pdf")
  ) {
    // No agregar transformaciones
    console.log("Generating URL for PDF without 'fl_attachment'");
  } else if (resourceType === "raw") {
    // Para otros archivos, agregar 'fl_attachment' para forzar descarga
    urlOptions.transformation = [
      {
        flags: "attachment",
        attachment: originalFilename || "file",
      },
    ];
    console.log("Generating URL for raw file with 'fl_attachment'");
  }

  return cloudinary.url(publicId, urlOptions);
};
