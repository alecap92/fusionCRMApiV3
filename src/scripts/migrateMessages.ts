// scripts/migrateMessages.ts
import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
import ConversationPipelineModel from "../models/ConversationPipelineModel";
import MessageModel from "../models/MessageModel";
import ContactModel from "../models/ContactModel";
import ConversationModel from "../models/ConversationModel";

dotenv.config(); // Carga MONGODB_URI, etc.

const BATCH_SIZE = 1000;

async function migrate(orgId: Types.ObjectId) {
  // 1. ── Pipeline por defecto ────────────────────────────────────────────────
  const defaultPipe = await ConversationPipelineModel.findOne({
    organization: orgId,
    isDefault: true,
  }).lean();

  if (!defaultPipe) throw new Error("No hay pipeline por defecto");

  // Localiza la etapa "Cerrado"; si no está, usa order 3
  const closedStage = defaultPipe.stages.find(
    (s) => s.name === "Cerrado" || s.order === 3
  );
  const closedOrder = closedStage ? closedStage.order : 3;

  // 2. ── Cursor de mensajes sin conversation ────────────────────────────────
  const cursor = MessageModel.find({
    organization: orgId,
    conversation: { $exists: false },
  }).cursor();

  // Pequeña caché en RAM para no repetir búsquedas / inserciones
  const convCache = new Map<string, Types.ObjectId>();

  let ops: any[] = [];
  let processed = 0;
  let incomingCount = 0;
  let outgoingCount = 0;

  for await (const msg of cursor) {
    // 3-a. ¿Quién es el número externo?
    const externalNumber = msg.direction === "incoming" ? msg.from : msg.to;

    // Incrementar contadores
    if (msg.direction === "incoming") {
      incomingCount++;
    } else {
      outgoingCount++;
    }

    // Clave compuesta para la caché (org+tel)
    const cacheKey = `${orgId}:${externalNumber}`;

    let convId = convCache.get(cacheKey);

    if (!convId) {
      // 3-b. ── Contacto ─────────────────────────────────────────────────────
      let contactDoc = await ContactModel.findOne({
        organizationId: orgId,
        properties: {
          $elemMatch: {
            key: { $in: ["mobile", "phone"] },
            value: externalNumber,
          },
        },
      })
        .select("_id")
        .lean();

      if (!contactDoc) {
        const newContact = await ContactModel.create({
          organizationId: orgId,
          properties: [
            { key: "mobile", value: externalNumber, isVisible: true },
            {
              key: "firstName",
              value: msg.possibleName || "",
              isVisible: true,
            },
          ],
        });
        contactDoc = newContact.toObject() as any;
      }

      if (!contactDoc?._id) {
        console.error(
          `No se pudo crear/obtener contacto para ${externalNumber}`
        );
        continue;
      }

      const contactId = new Types.ObjectId(contactDoc._id.toString());

      // 3-c. ── Conversación ─────────────────────────────────────────────────
      const existingConv = await ConversationModel.findOne({
        organization: orgId,
        pipeline: defaultPipe._id,
        "participants.type": "contact",
        "participants.reference": contactId,
      })
        .select("_id")
        .lean();

      if (existingConv) {
        convId = new Types.ObjectId(existingConv._id.toString());
      } else {
        const newConv = await ConversationModel.create({
          title: externalNumber,
          organization: orgId,
          participants: {
            user: {
              type: "User",
              reference: msg.user,
            },
            contact: {
              type: "Contact",
              reference: externalNumber,
            },
          },
          pipeline: defaultPipe._id,
          currentStage: closedOrder,
          assignedTo: null,
          isResolved: true,
          priority: "medium",
          tags: [],
          firstContactTimestamp: msg.timestamp,
          metadata: [
            {
              key: "origen",
              value: "whatsapp",
            },
          ],
          isArchived: false,
        });

        convId = new Types.ObjectId((newConv as any)._id.toString());
      }

      if (convId) {
        convCache.set(cacheKey, convId);
      }
    }

    // 4. ── Prepara operación bulk para el mensaje ───────────────────────────
    if (convId) {
      ops.push({
        updateOne: {
          filter: { _id: msg._id },
          update: { $set: { conversation: convId } },
        },
      });

      if (ops.length === BATCH_SIZE) {
        await MessageModel.bulkWrite(ops);
        processed += ops.length;
        console.log(`→ ${processed} mensajes migrados`);
        ops = [];
      }
    }
  }

  // Graba las que queden.
  if (ops.length) {
    await MessageModel.bulkWrite(ops);
    processed += ops.length;
  }

  console.log(`✅ Migración terminada. Total: ${processed} mensajes.`);
  console.log(`📥 Mensajes entrantes: ${incomingCount}`);
  console.log(`📤 Mensajes salientes: ${outgoingCount}`);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION as string);

    // 👉🏻 Reemplaza por el _id real de tu organización
    await migrate(new Types.ObjectId("659d89b73c6aa865f1e7d6fb"));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
