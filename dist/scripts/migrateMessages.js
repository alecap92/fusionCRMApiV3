"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/migrateMessages.ts
const mongoose_1 = __importStar(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const ConversationPipelineModel_1 = __importDefault(require("../models/ConversationPipelineModel"));
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
const ContactModel_1 = __importDefault(require("../models/ContactModel"));
const ConversationModel_1 = __importDefault(require("../models/ConversationModel"));
dotenv_1.default.config(); // Carga MONGODB_URI, etc.
const BATCH_SIZE = 1000;
function migrate(orgId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        // 1. ── Pipeline por defecto ────────────────────────────────────────────────
        const defaultPipe = yield ConversationPipelineModel_1.default.findOne({
            organization: orgId,
            isDefault: true,
        }).lean();
        if (!defaultPipe)
            throw new Error("No hay pipeline por defecto");
        // Localiza la etapa "Cerrado"; si no está, usa order 3
        const closedStage = defaultPipe.stages.find((s) => s.name === "Cerrado" || s.order === 3);
        const closedOrder = closedStage ? closedStage.order : 3;
        // 2. ── Cursor de mensajes sin conversation ────────────────────────────────
        const cursor = MessageModel_1.default.find({
            organization: orgId,
            conversation: { $exists: false },
        }).cursor();
        // Pequeña caché en RAM para no repetir búsquedas / inserciones
        const convCache = new Map();
        let ops = [];
        let processed = 0;
        let incomingCount = 0;
        let outgoingCount = 0;
        try {
            for (var _d = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                _c = cursor_1_1.value;
                _d = false;
                const msg = _c;
                // 3-a. ¿Quién es el número externo?
                const externalNumber = msg.direction === "incoming" ? msg.from : msg.to;
                // Incrementar contadores
                if (msg.direction === "incoming") {
                    incomingCount++;
                }
                else {
                    outgoingCount++;
                }
                // Clave compuesta para la caché (org+tel)
                const cacheKey = `${orgId}:${externalNumber}`;
                let convId = convCache.get(cacheKey);
                if (!convId) {
                    // 3-b. ── Contacto ─────────────────────────────────────────────────────
                    let contactDoc = yield ContactModel_1.default.findOne({
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
                        const newContact = yield ContactModel_1.default.create({
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
                        contactDoc = newContact.toObject();
                    }
                    if (!(contactDoc === null || contactDoc === void 0 ? void 0 : contactDoc._id)) {
                        console.error(`No se pudo crear/obtener contacto para ${externalNumber}`);
                        continue;
                    }
                    const contactId = new mongoose_1.Types.ObjectId(contactDoc._id.toString());
                    // 3-c. ── Conversación ─────────────────────────────────────────────────
                    const existingConv = yield ConversationModel_1.default.findOne({
                        organization: orgId,
                        pipeline: defaultPipe._id,
                        "participants.type": "contact",
                        "participants.reference": contactId,
                    })
                        .select("_id")
                        .lean();
                    if (existingConv) {
                        convId = new mongoose_1.Types.ObjectId(existingConv._id.toString());
                    }
                    else {
                        const newConv = yield ConversationModel_1.default.create({
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
                        convId = new mongoose_1.Types.ObjectId(newConv._id.toString());
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
                        yield MessageModel_1.default.bulkWrite(ops);
                        processed += ops.length;
                        console.log(`→ ${processed} mensajes migrados`);
                        ops = [];
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Graba las que queden.
        if (ops.length) {
            yield MessageModel_1.default.bulkWrite(ops);
            processed += ops.length;
        }
        console.log(`✅ Migración terminada. Total: ${processed} mensajes.`);
        console.log(`📥 Mensajes entrantes: ${incomingCount}`);
        console.log(`📤 Mensajes salientes: ${outgoingCount}`);
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(process.env.MONGODB_CONNECTION);
        // 👉🏻 Reemplaza por el _id real de tu organización
        yield migrate(new mongoose_1.Types.ObjectId("659d89b73c6aa865f1e7d6fb"));
        yield mongoose_1.default.disconnect();
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}))();
