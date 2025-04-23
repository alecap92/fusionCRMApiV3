import { Request } from "express";

declare module 'fluent-ffmpeg' {
  const ffmpeg: any;
  export default ffmpeg;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: string;
        organizationId: string;
      };
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      };
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;
      MONGO_URI: string;
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      [key: string]: string | undefined;
    }
  }
}

export interface IAuthRequest extends Request {
  user?: IUser;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}
