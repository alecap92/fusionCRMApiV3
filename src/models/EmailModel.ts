import { Schema, model, Document, ObjectId } from "mongoose";

export interface IEmail extends Document {
  userId: ObjectId;
  from: string; // Dirección de correo del remitente como string
  to: string[]; // Array de direcciones de correo de los destinatarios
  cc?: string[]; // Array de direcciones en copia
  bcc?: string[]; // Array de direcciones en copia oculta
  subject: string; // Asunto del correo
  text?: string; // Contenido del correo en texto plano
  html?: string; // Contenido del correo en HTML
  date: Date; // Fecha del correo
  attachments?: {
    filename: string; // Nombre del archivo
    contentType: string; // Tipo MIME del archivo
    size?: number; // Tamaño del archivo en bytes
    partID?: string; // Identificador único de la parte MIME
  }[]; // Array de metadatos de los adjuntos
  uid: number; // Identificador único del correo en el servidor
  contactId?: ObjectId; // ID del contacto al que pertenece el correo
  folder: string; // Carpeta donde está ubicado el correo
  isRead: boolean; // Estado de lectura del correo
  isStarred: boolean; // Si el correo está marcado como favorito
  isImportant: boolean; // Si el correo está marcado como importante
  labels: string[]; // Etiquetas personalizadas del correo
  threadId?: string; // ID del hilo de conversación
  inReplyTo?: string; // ID del correo al que responde
  messageId: string; // ID único del mensaje
  priority: "low" | "normal" | "high"; // Prioridad del correo
  flags: string[]; // Flags IMAP del correo
  size?: number; // Tamaño total del correo en bytes
  snippet?: string; // Fragmento del contenido para vista previa
  hasAttachments: boolean; // Indicador rápido de adjuntos
  isEncrypted: boolean; // Si el correo está encriptado
  spamScore?: number; // Puntuación de spam (0-100)
  organizationId?: ObjectId; // ID de la organización (para multi-tenant)
}

const emailSchema = new Schema<IEmail>(
  {
    uid: {
      type: Number,
      required: true,
      index: true, // Índice para búsquedas rápidas por UID
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Índice para filtrar por usuario
    },
    from: {
      type: String,
      required: true,
      index: true, // Índice para búsquedas por remitente
    },
    to: {
      type: [String],
      required: true,
      index: true, // Índice para búsquedas por destinatario
    },
    cc: {
      type: [String],
      default: [],
    },
    bcc: {
      type: [String],
      default: [],
    },
    subject: {
      type: String,
      required: true,
      index: "text", // Índice de texto para búsqueda full-text
    },
    text: {
      type: String,
      index: "text", // Índice de texto para búsqueda full-text
    },
    html: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
      index: -1, // Índice descendente para ordenar por fecha
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
      index: true,
    },
    folder: {
      type: String,
      required: true,
      default: "INBOX",
      index: true, // Índice para filtrar por carpeta
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true, // Índice para filtrar correos no leídos
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true,
    },
    isImportant: {
      type: Boolean,
      default: false,
      index: true,
    },
    labels: {
      type: [String],
      default: [],
      index: true,
    },
    threadId: {
      type: String,
      index: true, // Índice para agrupar conversaciones
    },
    inReplyTo: {
      type: String,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true, // Garantizar unicidad del mensaje
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
      index: true,
    },
    flags: {
      type: [String],
      default: [],
    },
    size: {
      type: Number,
      index: true, // Para consultas de uso de almacenamiento
    },
    snippet: {
      type: String,
      maxlength: 200, // Limitar el snippet a 200 caracteres
    },
    hasAttachments: {
      type: Boolean,
      default: false,
      index: true, // Para filtrar correos con adjuntos
    },
    isEncrypted: {
      type: Boolean,
      default: false,
      index: true,
    },
    spamScore: {
      type: Number,
      min: 0,
      max: 100,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true, // Para multi-tenant
    },
    attachments: [
      {
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        size: { type: Number },
        partID: { type: String },
      },
    ],
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  }
);

// Índices compuestos para consultas complejas
emailSchema.index({ userId: 1, folder: 1, date: -1 }); // Para listar correos por carpeta
emailSchema.index({ userId: 1, isRead: 1, date: -1 }); // Para correos no leídos
emailSchema.index({ userId: 1, threadId: 1, date: 1 }); // Para conversaciones
emailSchema.index({ userId: 1, from: 1, date: -1 }); // Para correos por remitente
emailSchema.index({ userId: 1, hasAttachments: 1, date: -1 }); // Para correos con adjuntos
emailSchema.index({ userId: 1, isStarred: 1, date: -1 }); // Para correos favoritos
emailSchema.index({ userId: 1, labels: 1, date: -1 }); // Para correos por etiqueta

// Índice único compuesto para evitar duplicados
emailSchema.index({ userId: 1, uid: 1 }, { unique: true });

// Middleware pre-save para generar snippet y detectar adjuntos
emailSchema.pre("save", function (next) {
  // Generar snippet del contenido
  if (this.text && !this.snippet) {
    this.snippet = this.text.substring(0, 200).replace(/\s+/g, " ").trim();
  } else if (this.html && !this.snippet) {
    // Extraer texto del HTML para el snippet
    const textFromHtml = this.html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    this.snippet = textFromHtml.substring(0, 200);
  }

  // Detectar si tiene adjuntos
  this.hasAttachments = !!(this.attachments && this.attachments.length > 0);

  // Generar messageId si no existe
  if (!this.messageId) {
    this.messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${this.userId}`;
  }

  next();
});

// Métodos estáticos útiles
emailSchema.statics.findByThread = function (userId: string, threadId: string) {
  return this.find({ userId, threadId }).sort({ date: 1 });
};

emailSchema.statics.findUnread = function (userId: string, folder?: string) {
  const query: any = { userId, isRead: false };
  if (folder) query.folder = folder;
  return this.find(query).sort({ date: -1 });
};

emailSchema.statics.findByLabel = function (userId: string, label: string) {
  return this.find({ userId, labels: label }).sort({ date: -1 });
};

emailSchema.statics.getStorageUsage = function (userId: string) {
  return this.aggregate([
    { $match: { userId } },
    { $group: { _id: null, totalSize: { $sum: "$size" }, count: { $sum: 1 } } },
  ]);
};

// Métodos de instancia
emailSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

emailSchema.methods.markAsUnread = function () {
  this.isRead = false;
  return this.save();
};

emailSchema.methods.addLabel = function (label: string) {
  if (!this.labels.includes(label)) {
    this.labels.push(label);
    return this.save();
  }
  return Promise.resolve(this);
};

emailSchema.methods.removeLabel = function (label: string) {
  this.labels = this.labels.filter((l: string) => l !== label);
  return this.save();
};

export default model<IEmail>("Email", emailSchema);
