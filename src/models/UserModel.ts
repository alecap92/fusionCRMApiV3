import { JwtPayload } from "jsonwebtoken";
import { Schema, model, Document, ObjectId } from "mongoose";

interface IImapSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean; // Usado para conexiones seguras en IMAP
  lastUID?: number; // Opcional, usado para sincronización incremental
}

interface ISmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // Define si se usa una conexión segura para SMTP
}

interface IEmailSettings {
  emailAddress: string;
  imapSettings: IImapSettings;
  smtpSettings: ISmtpSettings;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  _id: ObjectId;
  emailSettings: IEmailSettings;
  pushToken: string[];
  organizationId: string;
  firebaseUid?: string; // UID de Firebase para usuarios autenticados con Firebase
  avatar?: string; // URL del avatar del usuario
  lastLogoutAt?: Date; // Timestamp del último cierre de sesión global
}

export interface IUserPayload
  extends Pick<IUser, "_id" | "email" | "firstName" | "lastName" | "mobile">,
    JwtPayload {
  organizationId: string;
  rememberMe?: boolean;
  role?: string;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, unique: true },
    mobile: { type: String },
    password: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    pushToken: [String],
    firebaseUid: { type: String, required: false }, // UID de Firebase
    avatar: { type: String, required: false }, // URL del avatar
    lastLogoutAt: { type: Date, required: false }, // Campo para rastrear el último logout global
    emailSettings: {
      emailAddress: { type: String, required: true },
      imapSettings: {
        host: { type: String, required: false, default: "" },
        port: { type: Number, required: false, default: 993 },
        user: { type: String, required: false, default: "" },
        password: { type: String, required: false, default: "" },
        tls: { type: Boolean, default: true },
        lastUID: { type: Number, default: 0 }, // Inicializa en 0 si no se usa aún
      },
      smtpSettings: {
        host: { type: String, required: false, default: "" },
        port: { type: Number, required: false, default: 587 },
        user: { type: String, required: false, default: "" },
        password: { type: String, required: false, default: "" },
        secure: { type: Boolean, required: false, default: false }, // Define si usa conexión segura
      },
    },
  },
  {
    timestamps: true,
  }
);

export default model<IUser>("User", userSchema);
