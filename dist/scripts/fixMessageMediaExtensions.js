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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
const client_s3_1 = require("@aws-sdk/client-s3");
dotenv_1.default.config();
const S3_BUCKET = process.env.S3_BUCKET_NAME || "fusioncrmbucket";
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const s3 = new client_s3_1.S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});
function inferExtensionFromContentType(contentType) {
    if (!contentType)
        return null;
    const map = {
        "application/pdf": "pdf",
        "application/postscript": "ps",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "text/plain": "txt",
        "text/csv": "csv",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "video/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "application/zip": "zip",
    };
    return map[contentType] || null;
}
function hasFileExtension(pathname) {
    return /\.[A-Za-z0-9]{1,8}$/.test(pathname);
}
function processOneMessage(messageId, bucketHost) {
    return __awaiter(this, void 0, void 0, function* () {
        const msg = yield MessageModel_1.default.findById(messageId);
        if (!msg)
            return;
        const url = msg.mediaUrl;
        if (!url)
            return;
        try {
            const u = new URL(url);
            if (u.hostname !== bucketHost)
                return; // no es nuestro bucket
            const key = u.pathname.replace(/^\//, "");
            if (hasFileExtension(key))
                return; // ya tiene extensión
            // HEAD para obtener Content-Type
            const head = yield s3.send(new client_s3_1.HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
            const contentType = head.ContentType || null;
            const ext = inferExtensionFromContentType(contentType);
            if (!ext) {
                console.warn(`Saltando ${key}: Content-Type desconocido (${contentType})`);
                return;
            }
            const newKey = `${key}.${ext}`;
            // Copiar al nuevo objeto si no existe aún
            yield s3.send(new client_s3_1.CopyObjectCommand({
                Bucket: S3_BUCKET,
                CopySource: `/${S3_BUCKET}/${encodeURIComponent(key)}`,
                Key: newKey,
                ContentType: contentType || undefined,
                MetadataDirective: "REPLACE",
            }));
            // Borrar el antiguo
            yield s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
            // Actualizar la URL en Mongo
            const newUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${newKey}`;
            msg.mediaUrl = newUrl;
            yield msg.save();
            console.log(`✔ Actualizado mensaje ${msg._id}: ${url} -> ${newUrl}`);
        }
        catch (err) {
            console.error(`✖ Error procesando ${msg._id}:`, err);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const mongoUri = process.env.MONGODB_CONNECTION || process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error("Falta MONGODB_CONNECTION");
        yield mongoose_1.default.connect(mongoUri);
        const bucketHost = `${S3_BUCKET}.s3.amazonaws.com`;
        // Buscar mensajes de documento con URL al bucket y sin extensión
        const candidates = yield MessageModel_1.default.find({
            type: "document",
            mediaUrl: {
                $regex: new RegExp(`https://${bucketHost}/[^\\.?]+$`),
            },
        })
            .select("_id mediaUrl")
            .lean();
        console.log(`Encontrados ${candidates.length} mensajes para corregir`);
        for (const c of candidates) {
            yield processOneMessage(String(c._id), bucketHost);
        }
        yield mongoose_1.default.disconnect();
    });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
