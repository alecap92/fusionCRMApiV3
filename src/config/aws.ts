import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require("fluent-ffmpeg");

import ffmpegPath from "ffmpeg-static";

import { PassThrough } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath || "");

// Configura el cliente de S3
const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Función para limpiar nombres de archivo conservando la extensión
const limpiarNombreArchivo = (nombre: string): string => {
  const parts = nombre.split(".");
  const hasExt = parts.length > 1;
  const ext = hasExt ? parts.pop() as string : "";
  const base = parts.join(".");
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
};

// Convierte audio/ogg a audio/mpeg (mp3)
const convertirAudio = async (mediaBuffer: Buffer): Promise<Buffer> => {
  const inputStream = new PassThrough();
  inputStream.end(mediaBuffer);

  const outputStream = new PassThrough();
  const chunks: Buffer[] = [];

  // Escucha los datos convertidos
  outputStream.on("data", (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    ffmpeg(inputStream)
      .inputFormat("ogg")
      .toFormat("mp3")
      .on("end", resolve)
      .on("error", reject)
      .pipe(outputStream, { end: true });
  });

  return Buffer.concat(chunks);
};

// Función para subir un archivo
export const subirArchivo = async (
  mediaBuffer: Buffer,
  nombre: string,
  type: string
): Promise<string> => {
  try {
    // Si el archivo es de tipo audio/ogg, conviértelo
    if (type.includes("audio/ogg")) {
      mediaBuffer = await convertirAudio(mediaBuffer);
      nombre = `${limpiarNombreArchivo(nombre)}.mp3`; // Concatena la extensión
      type = "audio/mpeg"; // Actualiza el Content-Type
    } else {
      nombre = limpiarNombreArchivo(nombre);
    }

    // Parámetros para subir a S3
    const params: PutObjectCommandInput = {
      Bucket: "fusioncrmbucket",
      Key: nombre,
      Body: mediaBuffer,
      ContentType: type,
    };

    // Utiliza el comando `PutObjectCommand` para subir el archivo
    const command = new PutObjectCommand(params);
    await s3.send(command);

    const url = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    return url; // Devuelve la URL del archivo subido
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    throw error;
  }
};
