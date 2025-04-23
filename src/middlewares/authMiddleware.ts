import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IAuthRequest } from "../types/index";
import { IUserPayload } from "../models/UserModel";

dotenv.config();

const secretKey = process.env.SECRET_KEY as string;

// Función para generar un token JWT
export const generateToken = (
  user: IUserPayload,
  rememberMe = false
): string => {
  const payload: IUserPayload = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobile: user.mobile,
    organizationId: user.organizationId,
    rememberMe,
    role: user.role || "",
  };

  // Ajusta la expiración si "rememberMe" es true
  const expiresIn = rememberMe ? "30d" : "30d";
  const token = jwt.sign(payload, secretKey, { expiresIn });

  return token;
};

// Middleware para verificar el token JWT
export const verifyToken = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Formato de token incorrecto" });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as IUserPayload;
    req.user = decoded; // Se asigna la info decodificada a req.user
    next();
  } catch (error: any) {
    console.log("error en verifyToken", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token no válido" });
    }
    console.error("Error verifying token: ", error.message);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Middleware para verificar y extraer información del token JWT (similar a verifyToken, si lo quieres separado)
export const verifySession = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Formato de token incorrecto" });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as IUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error verifying session:", error);
    res.status(401).json({ message: "Token no válido" });
  }
};
