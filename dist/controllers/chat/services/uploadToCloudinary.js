"use strict";
// utils/uploadToCloudinary.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const uploadToCloudinary = (mediaBuffer, resourceType, originalFilename) => {
    return new Promise((resolve, reject) => {
        let options = {
            resource_type: resourceType,
        };
        if (originalFilename) {
            options.use_filename = true;
            options.unique_filename = false;
            options.filename_override = originalFilename; // Usar el nombre original del archivo
        }
        const uploadStream = cloudinary_1.v2.uploader.upload_stream(options, (error, result) => {
            if (error) {
                console.error("Error uploading to Cloudinary:", error);
                reject(error);
            }
            else {
                console.log("Upload successful:", result);
                const mediaId = result.public_id;
                const url = generateMediaUrl(result.public_id, resourceType, originalFilename);
                const originalFilenameResult = result.original_filename;
                const mimeType = result.format;
                resolve({
                    url,
                    mediaId,
                    originalFilename: originalFilenameResult,
                    mimeType,
                });
            }
        });
        uploadStream.end(mediaBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
// Nueva función para generar la URL sin el flag 'attachment' para PDFs
const generateMediaUrl = (publicId, resourceType, originalFilename) => {
    let urlOptions = {
        secure: true,
        resource_type: resourceType,
    };
    // Si el recurso es un documento PDF, no agregar 'fl_attachment'
    if (resourceType === "raw" &&
        (originalFilename === null || originalFilename === void 0 ? void 0 : originalFilename.toLowerCase().endsWith(".pdf"))) {
        // No agregar transformaciones
        console.log("Generating URL for PDF without 'fl_attachment'");
    }
    else if (resourceType === "raw") {
        // Para otros archivos, agregar 'fl_attachment' para forzar descarga
        urlOptions.transformation = [
            {
                flags: "attachment",
                attachment: originalFilename || "file",
            },
        ];
        console.log("Generating URL for raw file with 'fl_attachment'");
    }
    return cloudinary_1.v2.url(publicId, urlOptions);
};
