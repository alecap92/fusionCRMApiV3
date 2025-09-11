import { Schema, model, Document, ObjectId } from "mongoose";

export interface IApiToken extends Document {
  _id: ObjectId;
  userId: ObjectId;
  organizationId: ObjectId;
  name: string;
  description?: string;
  tokenHash: string; // Hash del token para búsqueda segura
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date; // null para tokens que no expiran
  createdBy: ObjectId; // Usuario que creó el token
}

const ApiTokenSchema = new Schema<IApiToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      required: true,
      validate: {
        validator: function (permissions: string[]) {
          return permissions.length > 0;
        },
        message: "Debe tener al menos un permiso",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para optimizar consultas
ApiTokenSchema.index({ userId: 1, isActive: 1 });
ApiTokenSchema.index({ organizationId: 1, isActive: 1 });
ApiTokenSchema.index({ tokenHash: 1, isActive: 1 });

// Middleware para eliminar tokens expirados automáticamente
ApiTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para verificar si el token ha expirado
ApiTokenSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Método para desactivar el token
ApiTokenSchema.methods.deactivate = function (): Promise<IApiToken> {
  this.isActive = false;
  return this.save();
};

// Método virtual para obtener información básica del token (sin hash)
ApiTokenSchema.virtual("info").get(function () {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    permissions: this.permissions,
    isActive: this.isActive,
    createdAt: this.createdAt,
    lastUsedAt: this.lastUsedAt,
    expiresAt: this.expiresAt,
  };
});

// Configurar toJSON para excluir campos sensibles
ApiTokenSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.tokenHash;
    return ret;
  },
});

export default model<IApiToken>("ApiToken", ApiTokenSchema);
