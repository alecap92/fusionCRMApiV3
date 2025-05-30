"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subirArchivo = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require("fluent-ffmpeg");
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const stream_1 = require("stream");
ffmpeg.setFfmpegPath(ffmpeg_static_1.default || "");
// Configura el cliente de S3
const s3 = new client_s3_1.S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});
// Función para limpiar nombres de archivo
const limpiarNombreArchivo = (nombre) => {
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
const convertirAudio = (mediaBuffer) => __awaiter(void 0, void 0, void 0, function* () {
    const inputStream = new stream_1.PassThrough();
    inputStream.end(mediaBuffer);
    const outputStream = new stream_1.PassThrough();
    const chunks = [];
    // Escucha los datos convertidos
    outputStream.on("data", (chunk) => chunks.push(chunk));
    yield new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .inputFormat("ogg")
            .toFormat("mp3")
            .on("end", resolve)
            .on("error", reject)
            .pipe(outputStream, { end: true });
    });
    return Buffer.concat(chunks);
});
// Función para subir un archivo
const subirArchivo = (mediaBuffer, nombre, type) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Si el archivo es de tipo audio/ogg, conviértelo
        if (type.includes("audio/ogg")) {
            console.log("Convirtiendo archivo OGG a MP3...");
            mediaBuffer = yield convertirAudio(mediaBuffer);
            nombre = `${limpiarNombreArchivo(nombre)}.mp3`; // Concatena la extensión
            type = "audio/mpeg"; // Actualiza el Content-Type
        }
        else {
            nombre = limpiarNombreArchivo(nombre);
        }
        // Parámetros para subir a S3
        const params = {
            Bucket: "fusioncrmbucket",
            Key: nombre,
            Body: mediaBuffer,
            ContentType: type,
        };
        // Utiliza el comando `PutObjectCommand` para subir el archivo
        const command = new client_s3_1.PutObjectCommand(params);
        yield s3.send(command);
        const url = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
        console.log("Archivo subido:", url);
        return url; // Devuelve la URL del archivo subido
    }
    catch (error) {
        console.error("Error subiendo archivo:", error);
        throw error;
    }
});
exports.subirArchivo = subirArchivo;
