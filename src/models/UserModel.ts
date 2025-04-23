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
    emailSettings: {
      emailAddress: { type: String, required: true },
      imapSettings: {
        host: { type: String, required: true },
        port: { type: Number, required: true },
        user: { type: String, required: true },
        password: { type: String, required: true },
        tls: { type: Boolean },
        lastUID: { type: Number }, // Inicializa en 0 si no se usa aún
      },
      smtpSettings: {
        host: { type: String, required: true },
        port: { type: Number, required: true },
        user: { type: String, required: true },
        password: { type: String, required: true },
        secure: { type: Boolean, required: true }, // Define si usa conexión segura
      },
    },
  },
  {
    timestamps: true,
  }
);

export default model<IUser>("User", userSchema);
