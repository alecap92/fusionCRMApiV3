import mongoose from "mongoose";
import dotenv from "dotenv";
import MessageModel from "../models/MessageModel";
import {
  S3Client,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

const S3_BUCKET = process.env.S3_BUCKET_NAME || "fusioncrmbucket";
const S3_REGION = process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function inferExtensionFromContentType(contentType?: string | null): string | null {
  if (!contentType) return null;
  const map: Record<string, string> = {
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

function hasFileExtension(pathname: string): boolean {
  return /\.[A-Za-z0-9]{1,8}$/.test(pathname);
}

async function processOneMessage(messageId: string, bucketHost: string) {
  const msg = await MessageModel.findById(messageId);
  if (!msg) return;
  const url = msg.mediaUrl;
  if (!url) return;

  try {
    const u = new URL(url);
    if (u.hostname !== bucketHost) return; // no es nuestro bucket
    const key = u.pathname.replace(/^\//, "");
    if (hasFileExtension(key)) return; // ya tiene extensión

    // HEAD para obtener Content-Type
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    const contentType = head.ContentType || null;
    const ext = inferExtensionFromContentType(contentType);
    if (!ext) {
      console.warn(`Saltando ${key}: Content-Type desconocido (${contentType})`);
      return;
    }

    const newKey = `${key}.${ext}`;

    // Copiar al nuevo objeto si no existe aún
    await s3.send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        CopySource: `/${S3_BUCKET}/${encodeURIComponent(key)}`,
        Key: newKey,
        ContentType: contentType || undefined,
        MetadataDirective: "REPLACE",
      })
    );

    // Borrar el antiguo
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));

    // Actualizar la URL en Mongo
    const newUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${newKey}`;
    msg.mediaUrl = newUrl;
    await msg.save();

    console.log(`✔ Actualizado mensaje ${msg._id}: ${url} -> ${newUrl}`);
  } catch (err) {
    console.error(`✖ Error procesando ${msg._id}:`, err);
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_CONNECTION || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("Falta MONGODB_CONNECTION");
  await mongoose.connect(mongoUri);

  const bucketHost = `${S3_BUCKET}.s3.amazonaws.com`;

  // Buscar mensajes de documento con URL al bucket y sin extensión
  const candidates = await MessageModel.find({
    type: "document",
    mediaUrl: {
      $regex: new RegExp(`https://${bucketHost}/[^\\.?]+$`),
    },
  })
    .select("_id mediaUrl")
    .lean();

  console.log(`Encontrados ${candidates.length} mensajes para corregir`);

  for (const c of candidates) {
    await processOneMessage(String(c._id), bucketHost);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



