// utils/cloudinaryUtils.ts

import { v2 as cloudinary } from "cloudinary";

export const deleteMediaFromCloudinary = async (
  mediaIds: string[]
): Promise<void> => {
  try {
    await Promise.all(
      mediaIds.map(async (mediaId) => {
        await cloudinary.uploader.destroy(mediaId);
      })
    );
  } catch (error) {
    console.error("Error al eliminar media de Cloudinary:", error);
    throw error;
  }
};
